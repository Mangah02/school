// apps/api/src/workers/sms.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull'; // ✅ FIX: Namespace import for Bull
import { PrismaService } from '../core/prisma/prisma.service';
import { SmsProvider } from '../modules/communication/providers/sms.provider';
import { InjectQueue } from '@nestjs/bull';

@Processor('sms-queue')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private smsProvider: SmsProvider,
    @InjectQueue('email-queue') private emailQueue: Bull.Queue, // ✅ FIX: Use Bull.Queue
  ) {}

  @Process('send-sms')
  async handleSms(job: Bull.Job) { // ✅ FIX: Use Bull.Job
    const { school_id, recipient_id, recipient_contact, message, requested_by } = job.data;

    // 1. Create or Update Message Log
    const log = await this.prisma.messageLog.create({
      data: {
        school_id,
        channel: 'SMS',
        recipient_type: 'INDIVIDUAL', // Simplified for log
        recipient_id,
        recipient_contact,
        body: message,
        status: 'PENDING',
        retry_count: job.attemptsMade,
      }
    });

    try {
      // 2. Attempt to send via Africa's Talking
      const providerId = await this.smsProvider.sendSms(recipient_contact, message);
      
      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: { status: 'SENT', provider_message_id: providerId }
      });

      this.logger.log(`SMS sent successfully to ${recipient_contact}`);
      return { success: true };

    } catch (error: any) {
      this.logger.warn(`SMS attempt ${job.attemptsMade + 1} failed for ${recipient_contact}: ${error.message}`);
      
      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: { 
          retry_count: job.attemptsMade + 1, 
          error_message: error.message 
        }
      });

      // 3. FALLBACK LOGIC (Risk R-010)
      // If this is the FINAL attempt (Bull counts attempts starting from 0, so opts.attempts - 1 is the last one)
      // ✅ FIX: Added fallback '|| 1' to handle undefined attempts
      if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
        this.logger.error(`SMS permanently failed for ${recipient_contact}. Triggering EMAIL fallback.`);
        
        await this.prisma.messageLog.update({
          where: { id: log.id },
          data: { status: 'FALLBACK_TRIGGERED' }
        });

        // Queue the fallback email
        await this.emailQueue.add('send-email', {
          school_id,
          recipient_id,
          recipient_contact: recipient_contact, // Note: In production, lookup the email for this phone number
          subject: 'Urgent School Notification (SMS Delivery Failed)',
          body: `<p>Dear Parent/Guardian,</p><p>We tried to send you an SMS but it could not be delivered. Here is the message:</p><blockquote>${message}</blockquote>`,
          requested_by,
          is_fallback: true,
        });
      }

      // Throw error to tell BullMQ to retry (if not the last attempt)
      throw error; 
    }
  }
}