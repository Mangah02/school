// apps/api/src/modules/extra-curricular/__tests__/extra-curricular.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExtraCurricularService } from '../extra-curricular.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('ExtraCurricularService - Club Memberships (6.7)', () => {
  let service: ExtraCurricularService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtraCurricularService,
        { provide: PrismaService, useValue: {
          club: { findFirst: jest.fn() },
          student: { findFirst: jest.fn() },
          clubMember: { create: jest.fn() },
        }},
      ],
    }).compile();

    service = module.get<ExtraCurricularService>(ExtraCurricularService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should throw ConflictException if student is already in the club', async () => {
    jest.spyOn(prisma.club, 'findFirst').mockResolvedValue({ id: 'club-1' } as any);
    jest.spyOn(prisma.student, 'findFirst').mockResolvedValue({ id: 'stu-1' } as any);
    
    // Simulate Prisma unique constraint violation (P2002)
    jest.spyOn(prisma.clubMember, 'create').mockRejectedValue({ code: 'P2002' });

    const dto = { student_id: 'stu-1' };
    await expect(service.addMember('club-1', dto)).rejects.toThrow(ConflictException);
  });

  it('should add student to club successfully', async () => {
    jest.spyOn(prisma.club, 'findFirst').mockResolvedValue({ id: 'club-1' } as any);
    jest.spyOn(prisma.student, 'findFirst').mockResolvedValue({ id: 'stu-1' } as any);
    jest.spyOn(prisma.clubMember, 'create').mockResolvedValue({ id: 'mem-1' } as any);

    const dto = { student_id: 'stu-1', role: 'LEADER' };
    const result = await service.addMember('club-1', dto);

    expect(result.id).toBe('mem-1');
    expect(prisma.clubMember.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: 'LEADER' })
    }));
  });
});