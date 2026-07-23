// apps/api/src/modules/finance/waiver.service.ts
import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RequestWaiverDto, ProcessWaiverDto } from './dto/fee-waiver.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WaiverService {
  constructor(private prisma: PrismaService) {}

  async getPendingWaivers(schoolId: string, userRole: string) {
    let whereClause: any = {
      school_id: schoolId,
      status: 'PENDING'
    };

    // Filter based on role authority (SRS 20.2 matrix)
    if (userRole === 'finance_officer') {
      whereClause.required_approver = 'finance_officer';
    } else if (userRole === 'school_admin') {
      whereClause.required_approver = { in: ['finance_officer', 'school_admin'] };
    }
    // super_admin and board can see all pending waivers

    return this.prisma.feeWaiver.findMany({
      where: whereClause,
      include: {
        invoice: {
          include: {
            student: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getMyRequests(schoolId: string, userId: string) {
    return this.prisma.feeWaiver.findMany({
      where: {
        school_id: schoolId,
        requested_by_id: userId
      },
      include: {
        invoice: {
          include: {
            student: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async requestWaiver(dto: RequestWaiverDto, userId: string, schoolId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoice_id, school_id: schoolId, status: { not: 'VOID' } }
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const outstanding = invoice.total_amount - invoice.paid_amount - invoice.waived_amount;
    if (dto.waiver_amount > outstanding + 0.01) {
      throw new BadRequestException('Waiver amount exceeds outstanding balance');
    }

    const waiverPercent = (dto.waiver_amount / invoice.total_amount) * 100;
    
    let requiredApprover = 'finance_officer';
    if (waiverPercent > 25 && waiverPercent <= 50) {
      requiredApprover = 'school_admin';
    } else if (waiverPercent > 50) {
      requiredApprover = 'board';
      if (!dto.board_resolution_url) {
        throw new BadRequestException('Board resolution document is required for waivers exceeding 50%');
      }
    }

    return this.prisma.feeWaiver.create({
      data: {
        school_id: schoolId,
        invoice_id: invoice.id,
        requested_by_id: userId,
        waiver_amount: dto.waiver_amount,
        waiver_percent: waiverPercent,
        required_approver: requiredApprover,
        justification: dto.justification,
        board_resolution_url: dto.board_resolution_url,
        status: 'PENDING'
      }
    });
  }

  async processWaiver(dto: ProcessWaiverDto, userId: string, userRole: string, schoolId: string) {
    const waiver = await this.prisma.feeWaiver.findFirst({
      where: { id: dto.waiver_id, school_id: schoolId, status: 'PENDING' },
      include: { invoice: true }
    });
    if (!waiver) throw new NotFoundException('Waiver not found or already processed');

    if (dto.action === 'APPROVE') {
      if (waiver.required_approver === 'board' && userRole !== 'super_admin' && userRole !== 'board') {
         throw new ForbiddenException('Only Board/Super Admin can approve waivers > 50%');
      }
      if (waiver.required_approver === 'school_admin' && userRole !== 'school_admin' && userRole !== 'super_admin') {
         throw new ForbiddenException('Only Principal/Admin can approve waivers > 25%');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Waiver Status
      await tx.feeWaiver.update({
        where: { id: waiver.id },
        data: {
          status: dto.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          approved_by_id: userId,
          rejection_reason: dto.action === 'REJECT' ? (dto as any).rejection_reason : null
        }
      });

      // 2. If Approved, update Invoice and post Double-Entry Journals
      if (dto.action === 'APPROVE') {
        const newWaivedAmount = waiver.invoice.waived_amount + waiver.waiver_amount;
        const newStatus = (waiver.invoice.paid_amount + newWaivedAmount) >= waiver.invoice.total_amount ? 'PAID' : 'PARTIAL';

        await tx.invoice.update({
          where: { id: waiver.invoice_id },
          data: { waived_amount: newWaivedAmount, status: newStatus }
        });

        // Double-Entry: Debit Waiver Expense (Contra-Revenue), Credit Fee Receivable
        const transactionId = uuidv4();
        await tx.journalEntry.createMany({
          data: [
            {
              school_id: schoolId,
              transaction_id: transactionId,
              account_code: '5050_FEE_WAIVERS',
              description: `Fee Waiver Approved for Invoice ${waiver.invoice_id}`,
              debit: waiver.waiver_amount,
              credit: 0
            },
            {
              school_id: schoolId,
              transaction_id: transactionId,
              account_code: '1000_FEE_RECEIVABLE',
              description: `Fee Waiver Approved for Invoice ${waiver.invoice_id}`,
              debit: 0,
              credit: waiver.waiver_amount
            }
          ]
        });
      }

      return { success: true, action: dto.action };
    });
  }
}