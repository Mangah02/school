// apps/api/src/modules/compliance/retention.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CommunicationService } from '../communication/communication.service';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private prisma: PrismaService,
    private commsService: CommunicationService,
  ) {}

  /**
   * Runs daily at midnight. Handles 90-day pre-expiry alerts and hard purges.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processDailyRetention() {
    const schools = await this.prisma.school.findMany({ 
      where: { is_active: true },
      include: { retentionPolicy: true }
    });

    for (const school of schools) {
      const policy = school.retentionPolicy || { soft_delete_purge_days: 90 };
      const purgeDate = new Date();
      purgeDate.setDate(purgeDate.getDate() - policy.soft_delete_purge_days);
      
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() - (policy.soft_delete_purge_days - 5)); // Alert 5 days before

      // 1. Send 90-day pre-expiry alerts (Records between alertDate and purgeDate)
      await this.sendPreExpiryAlerts(school.id, alertDate, purgeDate);

      // 2. Hard Purge soft-deleted records older than purgeDate
      await this.purgeExpiredRecords(school.id, purgeDate);

      // 3. Purge old Audit Logs (based on retention years)
      const auditPurgeDate = new Date();
      auditPurgeDate.setFullYear(auditPurgeDate.getFullYear() - policy.audit_log_retention_years);
      await this.purgeOldAuditLogs(school.id, auditPurgeDate);
    }
  }

  private async sendPreExpiryAlerts(schoolId: string, alertDate: Date, purgeDate: Date) {
    const expiringStudents = await this.prisma.student.count({
      where: {
        school_id: schoolId,
        is_deleted: true,
        deleted_at: { gte: alertDate, lt: purgeDate }
      }
    });

    if (expiringStudents > 0) {
      this.logger.warn(`School ${schoolId} has ${expiringStudents} student records expiring in 5 days.`);
      // In production, fetch DPO email and send alert via commsService
    }
  }

  private async purgeExpiredRecords(schoolId: string, purgeDate: Date) {
    // Find all soft-deleted records older than the purge date
    const expiredStudents = await this.prisma.student.findMany({
      where: {
        school_id: schoolId,
        is_deleted: true,
        deleted_at: { lt: purgeDate }
      },
      select: { id: true, admission_number: true }
    });

    if (expiredStudents.length === 0) return;

    // Hard delete (Prisma will cascade or restrict based on DB constraints. 
    // For SMIS, we usually anonymize instead of hard deleting to preserve financial/audit integrity).
    // Here we anonymize the PII.
    for (const student of expiredStudents) {
      await this.prisma.student.update({
        where: { id: student.id },
        data: {
          first_name: 'ANONYMIZED',
          last_name: 'ANONYMIZED',
          admission_number: `DEL_${student.id.slice(0, 8)}`,
          // Clear other PII
          nationality: null,
          blood_group: null,
          medical_condition: null,
        }
      });
    }

    // Immutable Audit Log
    await this.prisma.auditLog.create({
      data: {
        school_id: schoolId,
        action: 'DATA_RETENTION_PURGE',
        entity_type: 'System',
        new_values: { records_anonymized: expiredStudents.length, purge_date: purgeDate.toISOString() }
      }
    });

    this.logger.log(`School ${schoolId}: Anonymized ${expiredStudents.length} expired student records.`);
  }

  private async purgeOldAuditLogs(schoolId: string, auditPurgeDate: Date) {
    // Note: True hard delete for audit logs if legally permitted, otherwise archive.
    // For this implementation, we hard delete audit logs older than the retention period.
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        school_id: schoolId,
        created_at: { lt: auditPurgeDate }
      }
    });
    if (result.count > 0) {
      this.logger.log(`School ${schoolId}: Hard purged ${result.count} old audit logs.`);
    }
  }
}