// apps/api/src/modules/finance/__tests__/waiver.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WaiverService } from '../waiver.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('WaiverService - Routing & Double Entry (7.6)', () => {
  let service: WaiverService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaiverService,
        { provide: PrismaService, useValue: {
          invoice: { findFirst: jest.fn() },
          feeWaiver: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
          journalEntry: { createMany: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
        }},
      ],
    }).compile();

    service = module.get<WaiverService>(WaiverService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should route to board and require resolution URL if waiver > 50%', async () => {
    jest.spyOn(prisma.invoice, 'findFirst').mockResolvedValue({ 
      id: 'inv-1', total_amount: 10000, paid_amount: 0, waived_amount: 0 
    } as any);

    const dto = { invoice_id: 'inv-1', waiver_amount: 6000, justification: 'Hardship' }; // 60%
    
    // Should throw because board_resolution_url is missing
    await expect(service.requestWaiver(dto as any, 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('should post double-entry journals when waiver is approved', async () => {
    const mockWaiver = {
      id: 'w-1', invoice_id: 'inv-1', waiver_amount: 5000, required_approver: 'school_admin',
      invoice: { total_amount: 10000, paid_amount: 0, waived_amount: 0 }
    };
    jest.spyOn(prisma.feeWaiver, 'findFirst').mockResolvedValue(mockWaiver as any);
    jest.spyOn(prisma.feeWaiver, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.invoice, 'update').mockResolvedValue({} as any); // via transaction

    const dto = { waiver_id: 'w-1', action: 'APPROVE' };
    await service.processWaiver(dto as any, 'admin-1', 'school_admin');

    expect(prisma.journalEntry.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ account_code: '5050_FEE_WAIVERS', debit: 5000 }),
        expect.objectContaining({ account_code: '1000_FEE_RECEIVABLE', credit: 5000 })
      ])
    }));
  });

  it('should block Principal from approving >50% board-level waivers', async () => {
    const mockWaiver = { id: 'w-1', required_approver: 'board', invoice: {} };
    jest.spyOn(prisma.feeWaiver, 'findFirst').mockResolvedValue(mockWaiver as any);

    const dto = { waiver_id: 'w-1', action: 'APPROVE' };
    await expect(service.processWaiver(dto as any, 'principal-1', 'school_admin')).rejects.toThrow(ForbiddenException);
  });
});