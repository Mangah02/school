// apps/api/src/modules/academic/__tests__/academic.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AcademicService } from '../academic.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('AcademicService', () => {
  let service: AcademicService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicService,
        { provide: PrismaService, useValue: {
          subject: { create: jest.fn() },
          class: { findFirst: jest.fn() },
          classSubject: { upsert: jest.fn() },
        }},
      ],
    }).compile();

    service = module.get<AcademicService>(AcademicService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should prevent assigning a CBC subject to an 844 class (R-01 Mitigation)', async () => {
    jest.spyOn(prisma.class, 'findFirst').mockResolvedValue({ id: 'c1', curriculum_type: '844' } as any);
    jest.spyOn(prisma.subject, 'findFirst').mockResolvedValue({ id: 's1', is_cbc: true } as any);

    const dto = { class_id: 'c1', subject_id: 's1' };

    await expect(service.assignSubjectToClass(dto as any)).rejects.toThrow(BadRequestException);
  });

  it('should allow assigning a standard subject to a CBC class', async () => {
    jest.spyOn(prisma.class, 'findFirst').mockResolvedValue({ id: 'c1', curriculum_type: 'CBC' } as any);
    jest.spyOn(prisma.subject, 'findFirst').mockResolvedValue({ id: 's1', is_cbc: false, name: 'Mathematics' } as any);
    jest.spyOn(prisma.classSubject, 'upsert').mockResolvedValue({} as any);

    const dto = { class_id: 'c1', subject_id: 's1' };
    const result = await service.assignSubjectToClass(dto as any);

    expect(prisma.classSubject.upsert).toHaveBeenCalled();
  });
});