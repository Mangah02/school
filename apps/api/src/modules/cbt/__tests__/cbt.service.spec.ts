// apps/api/src/modules/cbt/__tests__/cbt.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CbtService } from '../cbt.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('CbtService - Concurrency & Timer Enforcement (6.3 & 6.4)', () => {
  let service: CbtService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CbtService,
        { provide: PrismaService, useValue: {
          cBTExam: { findFirst: jest.fn(), findUnique: jest.fn() },
          cBTSession: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
          cBTAnswer: { upsert: jest.fn() },
          cBTProctoringLog: { create: jest.fn() },
        }},
        { provide: 'BullQueue_ai-grading', useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<CbtService>(CbtService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should enforce server-side timeout and auto-submit if >10 mins past end time', async () => {
    const tenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);
    jest.spyOn(prisma.cBTSession, 'findFirst').mockResolvedValue({ 
      id: 'sess-1', exam_id: 'exam-1', status: 'ACTIVE' 
    } as any);
    jest.spyOn(prisma.cBTExam, 'findUnique').mockResolvedValue({ 
      end_time: tenMinutesAgo 
    } as any);

    const savePromise = service.saveAnswer('sess-1', 'q-1', 'My Answer', new Date());
    await expect(savePromise).rejects.toThrow(ForbiddenException);
    
    // Verify force submit was triggered
    expect(prisma.cBTSession.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'TIMEOUT' })
    }));
  });

  it('should log proctoring events without disrupting the exam flow', async () => {
    jest.spyOn(prisma.cBTSession, 'findFirst').mockResolvedValue({ id: 'sess-1' } as any);
    jest.spyOn(prisma.cBTProctoringLog, 'create').mockResolvedValue({ id: 'log-1' } as any);

    const result = await service.logProctoringEvent('sess-1', 'TAB_SWITCH', { count: 1 });
    expect(result.id).toBe('log-1');
  });
});