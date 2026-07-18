// apps/api/src/workers/email.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../core/prisma/prisma.service';
import { EmailProvider } from '../modules/communication/providers/email.provider';

@Processor('email-queue')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private prisma: PrismaService,
    private emailProvider: EmailProvider,
  ) {}

  @Process('send-email')
  async handleEmail(job: Job) {
    const { school_id, recipient_id, recipient_contact, subject, body, requested_by, is_fallback } = job.data;

    const log = await this.prisma.messageLog.create({
      data: {
        school_id,
        channel: 'EMAIL',
        recipient_type: is_fallback ? 'FALLBACK' : 'INDIVIDUAL',
        recipient_id,
        recipient_contact,
        subject,
        body,
        status: 'PENDING',
      }
    });

    try {
      const providerId = await this.emailProvider.sendEmail(recipient_contact, subject, body);
      
      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: { status: 'SENT', provider_message_id: providerId }
      });

      return { success: true };
    } catch (error) {
      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error_message: error.message }
      });
      throw error;
    }
  }
}