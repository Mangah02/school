// apps/api/src/workers/whatsapp.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull'; // ✅ FIX: Namespace import for Bull
import { PrismaService } from '../core/prisma/prisma.service';
import { WhatsAppProvider } from '../modules/communication/providers/whatsapp.provider';

@Processor('whatsapp-queue')
export class WhatsAppProcessor {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(
    private prisma: PrismaService,
    private whatsappProvider: WhatsAppProvider,
  ) {}

  @Process('send-whatsapp')
  async handleWhatsApp(job: Bull.Job) { // ✅ FIX: Use Bull.Job
    const { school_id, recipient_id, recipient_contact, message } = job.data;

    const log = await this.prisma.messageLog.create({
      data: {
        school_id,
        channel: 'WHATSAPP',
        recipient_type: 'INDIVIDUAL',
        recipient_id,
        recipient_contact,
        body: message,
        status: 'PENDING',
      }
    });

    try {
      // REQ-COMMS-004: Rate limit is handled by BullMQ limiter configuration in the module registration
      const providerId = await this.whatsappProvider.sendWhatsAppMessage(recipient_contact, message);
      
      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: { status: 'SENT', provider_message_id: providerId }
      });

      return { success: true };
    } catch (error: any) {
      await this.prisma.messageLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error_message: error.message }
      });
      throw error;
    }
  }
}