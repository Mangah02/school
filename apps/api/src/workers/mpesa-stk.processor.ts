// apps/api/src/workers/mpesa-stk.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../core/prisma/prisma.service';

@Processor('mpesa-stk')
export class MpesaStkProcessor {
  private readonly logger = new Logger(MpesaStkProcessor.name);

  constructor(private prisma: PrismaService) {}

  /**
   * REQ-MPESA-002/003: Handles timeout checks and retries.
   * Configured with 5-level backoff: 30s, 2m, 10m, 1hr, 6hr.
   */
  @Process('check-timeout')
  async handleTimeoutCheck(job: Job) {
    const { payment_id } = job.data;
    
    const payment = await this.prisma.payment.findUnique({ where: { id: payment_id } });
    if (!payment) return;

    // If already resolved by callback, do nothing
    if (payment.mpesa_state === 'SUCCESS' || payment.mpesa_state === 'FAILED') {
      return;
    }

    // If this is the 5th attempt (job.attemptsMade === 5), move to RECONCILING
    if (job.attemptsMade >= 5) {
      this.logger.warn(`MPESA Payment ${payment_id} failed after 5 retries. Moving to RECONCILING.`);
      await this.prisma.payment.update({
        where: { id: payment_id },
        data: { mpesa_state: 'RECONCILING', status: 'FAILED', result_desc: 'Timeout after 5 retries' }
      });
      // TODO: Trigger alert to Finance Officer here
      return;
    }

    this.logger.log(`Timeout reached for ${payment_id}. Retrying query to Daraja (Attempt ${job.attemptsMade + 1})`);
    
    // In production, call Daraja Query API here to check status.
    // If still pending, throw error to trigger BullMQ backoff retry.
    throw new Error('Payment still pending, retrying...'); 
  }
}