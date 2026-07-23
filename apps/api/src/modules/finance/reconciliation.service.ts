// apps/api/src/modules/finance/reconciliation.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ReconciliationService {
  constructor(private prisma: PrismaService) {}

  async getPendingReconciliations(schoolId: string) {
    return this.prisma.payment.findMany({
      where: {
        school_id: schoolId,
        status: 'PENDING',
      },
      include: {
        invoice: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });
  }

  async confirmPayment(schoolId: string, paymentId: string, mpesaReceipt: string, justification: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, school_id: schoolId },
      include: { invoice: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'SUCCESS') throw new BadRequestException('Payment is already confirmed');

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCESS',
          mpesa_state: 'SUCCESS',
          reference: mpesaReceipt,
          result_code: 0,
          result_desc: `Manually confirmed: ${justification}`,
        },
      });

      const newPaidAmount = payment.invoice.paid_amount + payment.amount;
      const invoiceStatus = newPaidAmount >= payment.invoice.total_amount ? 'PAID' : 'PARTIAL';

      await tx.invoice.update({
        where: { id: payment.invoice.id },
        data: { 
          paid_amount: newPaidAmount, 
          status: invoiceStatus 
        },
      });

      await tx.auditLog.create({
        data: {
          school_id: schoolId,
          user_id: userId,
          action: 'MANUAL_RECONCILIATION',
          entity_type: 'Payment',
          entity_id: paymentId,
          new_values: { receipt: mpesaReceipt, justification },
        },
      });

      return { success: true, message: 'Payment confirmed and journals posted' };
    });
  }

  async rejectPayment(schoolId: string, paymentId: string, reason: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, school_id: schoolId },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          mpesa_state: 'FAILED',
          result_desc: `Rejected: ${reason}`,
        },
      });

      await tx.auditLog.create({
        data: {
          school_id: schoolId,
          user_id: userId,
          action: 'RECONCILIATION_REJECTED',
          entity_type: 'Payment',
          entity_id: paymentId,
          new_values: { reason },
        },
      });

      return { success: true, message: 'Payment rejected' };
    });
  }
}