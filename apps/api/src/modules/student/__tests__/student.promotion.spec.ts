// apps/api/src/modules/student/__tests__/student.promotion.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from '../students.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('StudentsService - Promotion & Curriculum (5.6)', () => {
  let service: StudentsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: {
          student: { findFirst: jest.fn(), update: jest.fn() },
          class: { findFirst: jest.fn() },
          enrollment: { update: jest.fn(), create: jest.fn() },
          academicYear: { findFirst: jest.fn().mockResolvedValue({ id: 'year-1' }) },
          auditLog: { create: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
        }},
        { provide: 'BullQueue_notifications', useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should BLOCK promoting a CBC student to an 844 class (Form 1)', async () => {
    jest.spyOn(prisma.student, 'findFirst').mockResolvedValue({ id: 'stu-1', curriculum_type: 'CBC', enrollment: {} } as any);
    jest.spyOn(prisma.class, 'findFirst').mockResolvedValue({ id: 'c-form1', curriculum_type: '844' } as any);

    const dto = { student_id: 'stu-1', new_class_id: 'c-form1', reason: 'Test' };

    await expect(service.promoteStudent(dto as any)).rejects.toThrow(BadRequestException);
  });

  it('should ALLOW promoting a TRANSITIONAL student to a CBC class', async () => {
    jest.spyOn(prisma.student, 'findFirst').mockResolvedValue({ id: 'stu-1', curriculum_type: 'TRANSITIONAL', enrollment: {} } as any);
    jest.spyOn(prisma.class, 'findFirst').mockResolvedValue({ id: 'c-grade7', curriculum_type: 'CBC' } as any);
    jest.spyOn(prisma.enrollment, 'create').mockResolvedValue({} as any);

    const dto = { student_id: 'stu-1', new_class_id: 'c-grade7', reason: 'Transitioning' };

    const result = await service.promoteStudent(dto as any);
    expect(result.message).toBe('Student promoted successfully');
  });
});