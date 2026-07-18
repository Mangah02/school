// apps/api/src/modules/finance/waiver.service.ts
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RequestWaiverDto, ProcessWaiverDto } from './dto/fee-waiver.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WaiverService {
  constructor(private prisma: PrismaService) {}

  /**
   * REQ-WAIVER-001/002: Initiates waiver and auto-routes based on percentage.
   */
  async requestWaiver(dto: RequestWaiverDto, userId: string) {
    const context = tenantStorage.getStore();

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoice_id, school_id: context.schoolId, status: { not: 'VOID' } }
    });
    if (!invoice) throw new BadRequestException('Invoice not found');

    const outstanding = invoice.total_amount - invoice.paid_amount - invoice.waived_amount;
    if (dto.waiver_amount > outstanding + 0.01) {
      throw new BadRequestException('Waiver amount exceeds outstanding balance');
    }

    const waiverPercent = (dto.waiver_amount / invoice.total_amount) * 100;
    
    // Determine required approver based on SRS 20.2 matrix
    let requiredApprover = 'finance_officer';
    if (waiverPercent > 25 && waiverPercent <= 50) {
      requiredApprover = 'school_admin'; // Principal
    } else if (waiverPercent > 50) {
      requiredApprover = 'board';
      // REQ-WAIVER-007: Board waivers require resolution document
      if (!dto.board_resolution_url) {
        throw new BadRequestException('Board resolution document is required for waivers exceeding 50%');
      }
    }

    return this.prisma.feeWaiver.create({
      data: {
        school_id: context.schoolId,
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

  /**
   * REQ-WAIVER-003/004/005: Processes approval/rejection and posts double-entry if approved.
   */
  async processWaiver(dto: ProcessWaiverDto, userId: string, userRole: string) {
    const context = tenantStorage.getStore();

    const waiver = await this.prisma.feeWaiver.findFirst({
      where: { id: dto.waiver_id, school_id: context.schoolId, status: 'PENDING' },
      include: { invoice: true }
    });
    if (!waiver) throw new BadRequestException('Waiver not found or already processed');

    // RBAC Check: Ensure user has authority to approve this tier
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
          rejection_reason: dto.action === 'REJECT' ? dto.rejection_reason : null
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
              school_id: context.schoolId,
              transaction_id: transactionId,
              account_code: '5050_FEE_WAIVERS', // Expense/Contra-Revenue account
              description: `Fee Waiver Approved for Invoice ${waiver.invoice_id}`,
              debit: waiver.waiver_amount,
              credit: 0
            },
            {
              school_id: context.schoolId,
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