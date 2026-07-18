// apps/api/src/modules/attendance/biometric.service.ts
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EncryptionService } from '../../core/security/encryption.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class BiometricService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  /**
   * REQ-BIO-003: Process attendance from ZKTeco device.
   * MUST verify explicit consent before logging.
   */
  async processBiometricAttendance(devicePayload: { student_admission_no: string, template_hash: string, timestamp: string }) {
    const context = tenantStorage.getStore();
    
    // 1. Find student
    const student = await this.prisma.student.findFirst({
      where: { admission_number: devicePayload.student_admission_no, school_id: context.schoolId, is_deleted: false }
    });
    if (!student) throw new BadRequestException('Student not found');

    // 2. REQ-BIO-003: Check for explicit biometric consent
    const consent = await this.prisma.consentRecord.findFirst({
      where: { 
        school_id: context.schoolId,
        data_subject_id: student.id, 
        data_category: 'BIOMETRIC', 
        consent_granted: true,
        revoked_at: null 
      }
    });

    if (!consent) {
      // Fallback required by REQ-BIO-003
      throw new ForbiddenException('No biometric consent on file. Fallback to QR/Manual required.');
    }

    // 3. Log attendance
    const date = new Date(devicePayload.timestamp);
    await this.prisma.attendanceRecord.upsert({
      where: { student_id_date: { student_id: student.id, date: date } },
      update: { status: 'PRESENT', method: 'BIOMETRIC', marked_by: 'SYSTEM_ZKTECO', server_updated_at: new Date() },
      create: {
        school_id: context.schoolId,
        student_id: student.id,
        date: date,
        status: 'PRESENT',
        method: 'BIOMETRIC',
        marked_by: 'SYSTEM_ZKTECO',
        server_updated_at: new Date(),
      }
    });

    return { success: true, student_id: student.id };
  }

  /**
   * REQ-BIO-002: Store biometric template encrypted at rest.
   */
  async storeBiometricTemplate(studentId: string, rawTemplateData: string, consentRecordId: string) {
    const context = tenantStorage.getStore();
    const encryptedData = this.encryption.encrypt(rawTemplateData);

    return this.prisma.biometricTemplate.upsert({
      where: { student_id: studentId },
      update: { template_data: encryptedData, consent_record_id: consentRecordId },
      create: {
        school_id: context.schoolId,
        student_id: studentId,
        template_data: encryptedData,
        consent_record_id: consentRecordId,
      }
    });
  }
}