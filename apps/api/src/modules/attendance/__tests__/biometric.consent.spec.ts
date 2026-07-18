// apps/api/src/modules/attendance/__tests__/biometric.consent.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BiometricService } from '../biometric.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EncryptionService } from '../../../core/security/encryption.service';
import { ForbiddenException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('BiometricService - KDPA Consent (REQ-BIO-003)', () => {
  let service: BiometricService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricService,
        { provide: PrismaService, useValue: {
          student: { findFirst: jest.fn() },
          consentRecord: { findFirst: jest.fn() },
          attendanceRecord: { upsert: jest.fn() },
        }},
        { provide: EncryptionService, useValue: { encrypt: jest.fn() } },
      ],
    }).compile();

    service = module.get<BiometricService>(BiometricService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should throw ForbiddenException if student lacks biometric consent', async () => {
    jest.spyOn(prisma.student, 'findFirst').mockResolvedValue({ id: 'stu-1' } as any);
    jest.spyOn(prisma.consentRecord, 'findFirst').mockResolvedValue(null); // No consent

    const payload = { student_admission_no: 'ADM001', template_hash: 'xyz', timestamp: '2026-07-20' };

    await expect(service.processBiometricAttendance(payload)).rejects.toThrow(ForbiddenException);
    expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
  });

  it('should process attendance if explicit consent exists', async () => {
    jest.spyOn(prisma.student, 'findFirst').mockResolvedValue({ id: 'stu-1' } as any);
    jest.spyOn(prisma.consentRecord, 'findFirst').mockResolvedValue({ id: 'cons-1' } as any);
    jest.spyOn(prisma.attendanceRecord, 'upsert').mockResolvedValue({} as any);

    const payload = { student_admission_no: 'ADM001', template_hash: 'xyz', timestamp: '2026-07-20' };
    const result = await service.processBiometricAttendance(payload);

    expect(result.success).toBe(true);
    expect(prisma.attendanceRecord.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ method: 'BIOMETRIC' })
    }));
  });
});