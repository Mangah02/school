// apps/api/src/modules/compliance/__tests__/dsar.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DsarService } from '../dsar.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('DsarService - KDPA Right to be Forgotten (10.8)', () => {
  let service: DsarService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DsarService,
        { provide: PrismaService, useValue: {
          student: { findFirst: jest.fn(), update: jest.fn() },
          guardian: { findFirst: jest.fn(), update: jest.fn() },
          medicalRecord: { updateMany: jest.fn() },
          deletionRequest: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
          auditLog: { create: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
        }},
      ],
    }).compile();

    service = module.get<DsarService>(DsarService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'dpo-1' });
  });

  it('should anonymize student PII and medical records upon execution', async () => {
    jest.spyOn(prisma.deletionRequest, 'findFirst').mockResolvedValue({
      id: 'req-1', target_entity_type: 'STUDENT', target_entity_id: 'stu-1', status: 'PENDING'
    } as any);
    jest.spyOn(prisma.student, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.medicalRecord, 'updateMany').mockResolvedValue({} as any);
    jest.spyOn(prisma.deletionRequest, 'update').mockResolvedValue({} as any);

    await service.processDeletion('req-1', 'dpo-1');

    // Verify Student PII scrubbed
    expect(prisma.student.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        first_name: 'ANONYMIZED',
        last_name: 'ANONYMIZED',
        is_deleted: true,
      })
    }));

    // Verify Medical Records scrubbed
    expect(prisma.medicalRecord.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        allergies: 'ANONYMIZED',
      })
    }));

    // Verify Audit Log created
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'DSAR_DELETION_EXECUTED' })
    }));
  });
});