// apps/api/src/modules/finance/__tests__/expense.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseService } from '../expense.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { StorageService } from '../../../core/storage/storage.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('ExpenseService - Auto-Posting & Budgeting (7.8)', () => {
  let service: ExpenseService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        { provide: PrismaService, useValue: {
          expenseCategory: { findUnique: jest.fn() },
          expense: { create: jest.fn() },
          journalEntry: { createMany: jest.fn(), aggregate: jest.fn() },
          budget: { findMany: jest.fn(), upsert: jest.fn() },
        }},
        { provide: StorageService, useValue: { uploadBuffer: jest.fn().mockResolvedValue('https://minio/mock-receipt.pdf') } },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should auto-post double-entry journals when expense status is POSTED', async () => {
    jest.spyOn(prisma.expense, 'create').mockResolvedValue({ id: 'exp-1' } as any);
    jest.spyOn(prisma.expenseCategory, 'findUnique').mockResolvedValue({ id: 'cat-1', name: 'Utilities', code: '5010' } as any);
    jest.spyOn(prisma.journalEntry, 'createMany').mockResolvedValue({} as any);

    const dto = { 
      category_id: 'cat-1', amount: 2000, description: 'Water bill', 
      payment_method: 'MPESA', status: 'POSTED', incurred_date: '2026-07-20' 
    };

    await service.recordExpense(dto as any, null, null, 'user-1');

    expect(prisma.journalEntry.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        // Debit Expense Account (5010_UTILITIES)
        expect.objectContaining({ account_code: '5010_UTILITIES', debit: 2000, credit: 0 }),
        // Credit MPESA Clearing (Asset reduction)
        expect.objectContaining({ account_code: '1050_MPESA_CLEARING', debit: 0, credit: 2000 })
      ])
    }));
  });

  it('should NOT post journals if expense status is DRAFT', async () => {
    jest.spyOn(prisma.expense, 'create').mockResolvedValue({ id: 'exp-1' } as any);

    const dto = { status: 'DRAFT', amount: 1000, category_id: 'cat-1', incurred_date: '2026-07-20', payment_method: 'CASH', description: 'Test' };
    await service.recordExpense(dto as any, null, null, 'user-1');

    expect(prisma.journalEntry.createMany).not.toHaveBeenCalled();
  });
});