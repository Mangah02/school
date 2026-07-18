// apps/api/src/modules/exam/__tests__/exam.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from '../exam.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('ExamService - Grade Calculation & CBC (6.1)', () => {
  let service: ExamService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: PrismaService, useValue: {
          exam: { findFirst: jest.fn() },
          student: { findMany: jest.fn() },
          examResult: { upsert: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
        }},
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should throw ForbiddenException if exam is locked', async () => {
    jest.spyOn(prisma.exam, 'findFirst').mockResolvedValue({ is_locked: true } as any);

    const dto = { exam_id: 'exam-1', marks: [] };
    await expect(service.enterMarks(dto as any, 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('should calculate standard 8-4-4 grade correctly', async () => {
    jest.spyOn(prisma.exam, 'findFirst').mockResolvedValue({ is_locked: false } as any);
    jest.spyOn(prisma.student, 'findMany').mockResolvedValue([{ id: 'stu-1', curriculum_type: '844' }] as any);
    jest.spyOn(prisma.examResult, 'upsert').mockResolvedValue({} as any);

    const dto = { 
      exam_id: 'exam-1', 
      marks: [{ student_id: 'stu-1', subject_id: 'sub-1', marks_obtained: 75, max_marks: 100 }] 
    };

    await service.enterMarks(dto as any, 'user-1');

    expect(prisma.examResult.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        grade: 'B',
        remarks: 'Very Good',
        is_cbc_assessment: false,
      })
    }));
  });

  it('should calculate CBC competency rating correctly', async () => {
    jest.spyOn(prisma.exam, 'findFirst').mockResolvedValue({ is_locked: false } as any);
    jest.spyOn(prisma.student, 'findMany').mockResolvedValue([{ id: 'stu-1', curriculum_type: 'CBC' }] as any);
    jest.spyOn(prisma.examResult, 'upsert').mockResolvedValue({} as any);

    const dto = { 
      exam_id: 'exam-1', 
      marks: [{ student_id: 'stu-1', subject_id: 'sub-1', marks_obtained: 45, max_marks: 100 }] 
    };

    await service.enterMarks(dto as any, 'user-1');

    expect(prisma.examResult.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        cbc_rating: 'BELOW',
        is_cbc_assessment: true,
      })
    }));
  });
});