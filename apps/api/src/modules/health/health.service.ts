// apps/api/src/modules/health/health.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EncryptionService } from '../../core/security/encryption.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  /**
   * REQ-KDPA-008: Upserts medical record. 
   * STRICTLY requires an active, unrevoked MEDICAL consent record.
   */
  async upsertMedicalRecord(
    studentId: string, 
    data: { allergies: string, chronic_conditions: string, current_medications: string, consent_evidence_url?: string },
    userId: string
  ) {
    const context = tenantStorage.getStore();

    // 1. Verify Student exists
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, school_id: context.schoolId }
    });
    if (!student) throw new NotFoundException('Student not found');

    // 2. Verify Active KDPA Consent
    const activeConsent = await this.prisma.consentRecord.findFirst({
      where: {
        school_id: context.schoolId,
        data_subject_id: studentId,
        data_category: 'MEDICAL',
        consent_granted: true,
        revoked_at: null // Must not be revoked
      }
    });

    if (!activeConsent) {
      throw new ForbiddenException('Cannot process medical data without explicit, active KDPA consent from the parent/guardian.');
    }

    // 3. Encrypt PII/PHI
    const encryptedAllergies = this.encryption.encrypt(data.allergies);
    const encryptedConditions = this.encryption.encrypt(data.chronic_conditions);
    const encryptedMeds = this.encryption.encrypt(data.current_medications);

    // 4. Upsert Record
    return this.prisma.medicalRecord.upsert({
      where: { student_id: studentId },
      update: {
        allergies: encryptedAllergies,
        chronic_conditions: encryptedConditions,
        current_medications: encryptedMeds,
      },
      create: {
        school_id: context.schoolId,
        student_id: studentId,
        allergies: encryptedAllergies,
        chronic_conditions: encryptedConditions,
        current_medications: encryptedMeds,
        consent_record_id: activeConsent.id,
      }
    });
  }

  /**
   * Logs a clinic visit. Automatically fetches and decrypts the medical record 
   * so the nurse has immediate context during triage.
   */
  async logClinicVisit(
    studentId: string, 
    data: { symptoms: string, diagnosis?: string, treatment: string, nurse_notes?: string },
    nurseUserId: string
  ) {
    const context = tenantStorage.getStore();

    const medicalRecord = await this.prisma.medicalRecord.findFirst({
      where: { student_id: studentId, school_id: context.schoolId }
    });
    if (!medicalRecord) throw new BadRequestException('No medical record found for this student. Cannot log visit.');

    // Create the visit log
    const visit = await this.prisma.clinicVisit.create({
      data: {
        school_id: context.schoolId,
        medical_record_id: medicalRecord.id,
        symptoms: data.symptoms,
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        nurse_notes: data.nurse_notes,
        attended_by: nurseUserId,
      }
    });

    // Decrypt medical history for the response (so the frontend can show it to the nurse)
    return {
      visit,
      patient_context: {
        allergies: this.encryption.decrypt(medicalRecord.allergies),
        chronic_conditions: this.encryption.decrypt(medicalRecord.chronic_conditions),
        current_medications: this.encryption.decrypt(medicalRecord.current_medications),
      }
    };
  }

  /**
   * Revokes consent (KDPA Right to Withdraw).
   */
  async revokeConsent(studentId: string, category: string) {
    const context = tenantStorage.getStore();
    
    // Find the active consent and set revoked_at
    const consent = await this.prisma.consentRecord.findFirst({
      where: {
        school_id: context.schoolId,
        data_subject_id: studentId,
        data_category: category,
        revoked_at: null
      }
    });

    if (!consent) throw new NotFoundException('No active consent found to revoke');

    return this.prisma.consentRecord.update({
      where: { id: consent.id },
      data: { revoked_at: new Date() }
    });
  }
}