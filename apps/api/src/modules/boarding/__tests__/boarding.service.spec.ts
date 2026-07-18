// apps/api/src/modules/boarding/__tests__/boarding.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BoardingService } from '../boarding.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('BoardingService - Gender & Capacity Enforcement (9.3)', () => {
  let service: BoardingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardingService,
        { provide: PrismaService, useValue: {
          student: { findFirst: jest.fn() },
          bed: { findFirst: jest.fn(), update: jest.fn() },
          bedAssignment: { create: jest.fn() },
          rollCall: { create: jest.fn() },
          rollCallRecord: { createMany: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
        }},
      ],
    }).compile();

    service = module.get<BoardingService>(BoardingService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should block allocation if student gender does not match dormitory type', async () => {
    jest.spyOn(prisma.student, 'findFirst').mockResolvedValue({ id: 'stu-1', gender: 'F' } as any);
    jest.spyOn(prisma.bed, 'findFirst').mockResolvedValue({ 
      id: 'bed-1', status: 'AVAILABLE', dormitory: { type: 'BOYS' } 
    } as any);

    await expect(service.allocateBed('stu-1', 'bed-1', 'year-1')).rejects.toThrow(BadRequestException);
  });

  it('should successfully allocate bed and mark as occupied if gender matches', async () => {
    jest.spyOn(prisma.student, 'findFirst').mockResolvedValue({ id: 'stu-1', gender: 'M' } as any);
    jest.spyOn(prisma.bed, 'findFirst').mockResolvedValue({ 
      id: 'bed-1', status: 'AVAILABLE', dormitory: { type: 'BOYS' } 
    } as any);
    jest.spyOn(prisma.bedAssignment, 'create').mockResolvedValue({} as any);
    jest.spyOn(prisma.bed, 'update').mockResolvedValue({} as any);

    const result = await service.allocateBed('stu-1', 'bed-1', 'year-1');
    expect(result.success).toBe(true);
    expect(prisma.bed.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'OCCUPIED' }
    }));
  });
});