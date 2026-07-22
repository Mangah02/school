// apps/api/src/modules/compliance/compliance.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  async getConsentStatus(userId: string, schoolId: string) {
    const record = await this.prisma.consentRecord.findFirst({
      where: {
        school_id: schoolId,
        data_subject_id: userId, // ✅ Ensure we check for this specific user
        data_category: 'KDPA_PRIVACY_NOTICE',
        revoked_at: null,
      },
    });
    return { has_accepted_kdpa: !!record };
  }

  async acknowledgeConsent(userId: string, schoolId: string, category: string) {
    await this.prisma.consentRecord.create({
      data: {
        school_id: schoolId,
        data_subject_id: userId, // ✅ THIS WAS MISSING. Added to satisfy Prisma schema.
        data_category: category,
        consent_granted: true,
        granted_at: new Date(),
      },
    });
    return { success: true, message: 'Consent acknowledged' };
  }

  async exportData(entityType: string, entityId: string) {
    // TODO: Implement DSAR export logic
    return { message: 'Export logic to be implemented', entityType, entityId };
  }

  async requestDeletion(entityType: string, entityId: string, reason: string, requestedById: string) {
    // TODO: Implement DSAR request logic
    return { message: 'Deletion request logic to be implemented', entityType, entityId, reason, requestedById };
  }

  async processDeletion(id: string, processedById: string) {
    // TODO: Implement DSAR execution logic
    return { message: 'Deletion execution logic to be implemented', id, processedById };
  }
}