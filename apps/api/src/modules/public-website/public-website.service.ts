// apps/api/src/modules/public/public.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class PublicWebsiteService {
  constructor(private prisma: PrismaService) {}

  async getActiveAnnouncements(schoolId: string) {
    return this.prisma.publicAnnouncement.findMany({
      where: { 
        school_id: schoolId, 
        is_active: true,
        publish_date: { lte: new Date() }
      },
      orderBy: { publish_date: 'desc' },
      take: 10,
    });
  }

  async submitContactForm(schoolId: string, data: { name: string, email: string, phone?: string, subject: string, message: string }) {
    return this.prisma.contactFormSubmission.create({
      data: {
        school_id: schoolId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        status: 'NEW'
      }
    });
  }

  async updateSubmissionStatus(submissionId: string, schoolId: string, status: string, adminNotes?: string) {
    return this.prisma.contactFormSubmission.update({
      where: { id: submissionId, school_id: schoolId },
      data: { status, admin_notes: adminNotes }
    });
  }
}