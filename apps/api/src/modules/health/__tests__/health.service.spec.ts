// apps/api/src/modules/health/__tests__/health.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EncryptionService } from '../../../core/security/encryption.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('HealthService - KDPA Consent & Encryption (9.5)', () => {
  let service: HealthService;
  let prisma: PrismaService;
  let encryption: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: {
          student: { findFirst: jest.fn() },
          consentRecord: { findFirst: jest.fn(), update: jest.fn() },
          medicalRecord: { findFirst: jest.fn(), upsert: jest.fn() },
          clinicVisit: { create: jest.fn() },
        }},
        { provide: EncryptionService, useValue: { 
          encrypt: jest.fn().mockReturnValue('encrypted_data'), 
          decrypt: jest.fn().mockReturnValue('decrypted_data') 
        }},
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prisma = module.get<PrismaService>(PrismaService);
    encryption = module.get<EncryptionService>(EncryptionService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'nurse-1' });
  });

  it('should throw ForbiddenException if active MEDICAL consent is missing', async () => {
    jest.spyOn(prisma.student, 'findFirst').mockResolvedValue({ id: 'stu-1' } as any);
    jest.spyOn(prisma.consentRecord, 'findFirst').mockResolvedValue(null); // No consent

    const data = { allergies: 'Peanuts', chronic_conditions: 'None', current_medications: 'None' };
    
    await expect(service.upsertMedicalRecord('stu-1', data as any, 'nurse-1')).rejects.toThrow(ForbiddenException);
    expect(prisma.medicalRecord.upsert).not.toHaveBeenCalled();
  });

  it('should encrypt PHI and upsert record if active consent exists', async () => {
    jest.spyOn(prisma.student, 'findFirst').mockResolvedValue({ id: 'stu-1' } as any);
    jest.spyOn(prisma.consentRecord, 'findFirst').mockResolvedValue({ id: 'consent-1', revoked_at: null } as any);
    jest.spyOn(prisma.medicalRecord, 'upsert').mockResolvedValue({ id: 'med-1' } as any);

    const data = { allergies: 'Peanuts', chronic_conditions: 'Asthma', current_medications: 'Inhaler' };
    await service.upsertMedicalRecord('stu-1', data as any, 'nurse-1');

    expect(encryption.encrypt).toHaveBeenCalledWith('Peanuts');
    expect(prisma.medicalRecord.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        allergies: 'encrypted_data',
        consent_record_id: 'consent-1'
      })
    }));
  });

  it('should decrypt medical history when logging a clinic visit', async () => {
    jest.spyOn(prisma.medicalRecord, 'findFirst').mockResolvedValue({ 
      id: 'med-1', allergies: 'encrypted_allergies', chronic_conditions: 'enc_cond', current_medications: 'enc_meds' 
    } as any);
    jest.spyOn(prisma.clinicVisit, 'create').mockResolvedValue({ id: 'visit-1' } as any);

    const data = { symptoms: 'Fever', treatment: 'Rest' };
    const result = await service.logClinicVisit('stu-1', data as any, 'nurse-1');

    expect(result.patient_context.allergies).toBe('decrypted_data');
    expect(encryption.decrypt).toHaveBeenCalledWith('encrypted_allergies');
  });
});