// apps/api/src/modules/compliance/__tests__/retention.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RetentionService } from '../retention.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CommunicationService } from '../../communication/communication.service';

describe('RetentionService - 90-Day Purge (10.7)', () => {
  let service: RetentionService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionService,
        { provide: PrismaService, useValue: {
          school: { findMany: jest.fn() },
          student: { count: jest.fn(), findMany: jest.fn(), update: jest.fn() },
          auditLog: { create: jest.fn(), deleteMany: jest.fn() },
        }},
        { provide: CommunicationService, useValue: { dispatchEmail: jest.fn() } },
      ],
    }).compile();

    service = module.get<RetentionService>(RetentionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should anonymize soft-deleted records older than the retention policy', async () => {
    jest.spyOn(prisma.school, 'findMany').mockResolvedValue([{
      id: 'sch-1', retentionPolicy: { soft_delete_purge_days: 90 }
    }] as any);
    
    // Mock finding 1 expired student
    jest.spyOn(prisma.student, 'findMany').mockResolvedValue([{ id: 'stu-1', admission_number: 'ADM001' }] as any);
    jest.spyOn(prisma.student, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);
    jest.spyOn(prisma.auditLog, 'deleteMany').mockResolvedValue({ count: 0 } as any);

    await service.processDailyRetention();

    expect(prisma.student.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'stu-1' },
      data: expect.objectContaining({ first_name: 'ANONYMIZED' })
    }));
    
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'DATA_RETENTION_PURGE' })
    }));
  });
});