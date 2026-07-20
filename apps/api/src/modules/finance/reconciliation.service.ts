// apps/api/src/modules/finance/reconciliation.service.ts
import { Injectable, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common'; // ✅ Added UnauthorizedException
import { PrismaService } from '../../core/prisma/prisma.service';
import { ManualConfirmPaymentDto, RejectPaymentDto } from './dto/reconciliation.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  async getReconcilingPayments() {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    return this.prisma.payment.findMany({
      where: { school_id: context.schoolId, mpesa_state: 'RECONCILING' },
      include: { invoice: { include: { student: true } } },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * REQ-MPESA-007/008: Finance Officer manually confirms a stuck payment.
   */
  async manualConfirm(dto: ManualConfirmPaymentDto, userId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    const payment = await this.prisma.payment.findFirst({
      where: { id: dto.payment_id, school_id: context.schoolId, mpesa_state: 'RECONCILING' },
      include: { invoice: true }
    });
    if (!payment) throw new BadRequestException('Payment not found or not in RECONCILING state');

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Payment State
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          mpesa_state: 'SUCCESS',
          status: 'SUCCESS',
          reference: dto.mpesa_receipt,
          result_desc: `Manual confirmation by ${userId}. Justification: ${dto.justification}`
        }
      });

      // 2. Update Invoice
      const newPaidAmount = payment.invoice.paid_amount + payment.amount;
      const newStatus = newPaidAmount >= payment.invoice.total_amount ? 'PAID' : 'PARTIAL';

      await tx.invoice.update({
        where: { id: payment.invoice_id },
        data: { paid_amount: newPaidAmount, status: newStatus }
      });

      // 3. Post Double-Entry Journals (Debit MPESA Clearing, Credit Fee Receivable)
      const transactionId = uuidv4();
      await tx.journalEntry.createMany({
        data: [
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: '1050_MPESA_CLEARING',
            description: `Manual Reconciliation Ref: ${dto.mpesa_receipt}`,
            debit: payment.amount,
            credit: 0
          },
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: '1000_FEE_RECEIVABLE',
            description: `Manual Reconciliation Ref: ${dto.mpesa_receipt}`,
            debit: 0,
            credit: payment.amount
          }
        ]
      });

      this.logger.log(`Payment ${payment.id} manually reconciled by ${userId}`);
      return { success: true, message: 'Payment confirmed and journals posted' };
    });
  }

  async rejectPayment(dto: RejectPaymentDto, userId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard
    
    await this.prisma.payment.update({
      where: { id: dto.payment_id, school_id: context.schoolId, mpesa_state: 'RECONCILING' },
      data: { 
        mpesa_state: 'FAILED', 
        status: 'FAILED', 
        result_desc: `Rejected by ${userId}: ${dto.reason}` 
      }
    });

    return { success: true, message: 'Payment rejected' };
  }

  /**
   * REQ-MPESA-009: Daily Reconciliation Report
   */
  async generateDailyReport(date: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const payments = await this.prisma.payment.findMany({
      where: {
        school_id: context.schoolId,
        method: 'MPESA',
        created_at: { gte: startDate, lt: endDate }
      }
    });

    const summary = {
      date,
      total_initiated: payments.filter(p => p.mpesa_state === 'INITIATED' || p.mpesa_state === 'PENDING').length,
      total_success: payments.filter(p => p.mpesa_state === 'SUCCESS').length,
      total_failed: payments.filter(p => p.mpesa_state === 'FAILED').length,
      total_reconciling: payments.filter(p => p.mpesa_state === 'RECONCILING').length,
      total_amount_collected: payments.filter(p => p.mpesa_state === 'SUCCESS').reduce((sum, p) => sum + p.amount, 0)
    };

    // In production, this would fetch the Daraja API report and compare discrepancies.
    // For now, we return the SMIS side of the ledger.
    return summary;
  }
}