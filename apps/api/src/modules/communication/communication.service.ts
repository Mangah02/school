// apps/api/src/modules/communication/communication.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

// ✅ FIX: Use namespace import for Bull
import * as Bull from 'bull'; 
import { InjectQueue } from '@nestjs/bull';

import { SendSmsDto } from './dto/send-sms.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class CommunicationService {
  constructor(
    private prisma: PrismaService,
    // ✅ FIX: Use Bull.Queue as the type annotation
    @InjectQueue('sms-queue') private smsQueue: Bull.Queue,
    @InjectQueue('email-queue') private emailQueue: Bull.Queue,
  ) {}

  // ... (the rest of your dispatchSms, dispatchEmail, and resolveRecipients methods remain exactly the same)

  async dispatchSms(dto: SendSmsDto, userId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    const recipients = await this.resolveRecipients(dto.recipient_type, dto.recipient_ids, dto.class_id, 'SMS');

    if (recipients.length === 0) throw new BadRequestException('No valid recipients found');

    const jobs = recipients.map(recipient => {
      return this.smsQueue.add('send-sms', {
        school_id: context.schoolId,
        recipient_id: recipient.id,
        recipient_contact: recipient.phone,
        message: dto.message,
        requested_by: userId,
      }, {
        // Risk R-010: 3 attempts, 5-minute fixed backoff
        attempts: 3,
        backoff: { type: 'fixed', delay: 5 * 60 * 1000 }, 
      });
    });

    await Promise.all(jobs);
    return { success: true, dispatched_count: recipients.length };
  }

  async dispatchEmail(dto: SendEmailDto, userId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    const recipients = await this.resolveRecipients(dto.recipient_type, dto.recipient_ids, dto.class_id, 'EMAIL');

    if (recipients.length === 0) throw new BadRequestException('No valid recipients found');

    const jobs = recipients.map(recipient => {
      return this.emailQueue.add('send-email', {
        school_id: context.schoolId,
        recipient_id: recipient.id,
        recipient_contact: recipient.email,
        subject: dto.subject,
        body: dto.body,
        requested_by: userId,
      });
    });

    await Promise.all(jobs);
    return { success: true, dispatched_count: recipients.length };
  }

  // Helper to fetch contacts based on type
  // Updated signature to accept undefined for optional fields
  private async resolveRecipients(type: string, ids: string[] | undefined, classId: string | undefined, channel: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');
    
    if (type === 'INDIVIDUAL') {
      // Fallback to empty array if ids is undefined
      const safeIds = ids || [];
      return this.prisma.guardian.findMany({
        where: { id: { in: safeIds }, school_id: context.schoolId },
        select: { id: true, phone: true, email: true }
      });
    }
    
    if (type === 'CLASS') {
      const students = await this.prisma.student.findMany({
        where: { stream: { class_id: classId || '' }, school_id: context.schoolId, is_deleted: false },
        include: { guardians: { where: { guardian: { is_primary: true } }, include: { guardian: true } } }
      });
      return students.map(s => s.guardians[0]?.guardian).filter(g => g && (channel === 'SMS' ? g.phone : g.email));
    }

    // ALL_PARENTS fallback
    return this.prisma.guardian.findMany({
      where: { school_id: context.schoolId, is_deleted: false },
      select: { id: true, phone: true, email: true }
    });
  }
}