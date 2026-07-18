// apps/api/src/modules/hr/__tests__/payroll.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PayrollService } from '../payroll.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('PayrollService - Double Entry & Statutory Deductions (7.11)', () => {
  let service: PayrollService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: PrismaService, useValue: {
          staff: { findMany: jest.fn() },
          payrollRecord: { findUnique: jest.fn(), create: jest.fn() },
          journalEntry: { createMany: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
        }},
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should post balanced double-entry journals for monthly payroll', async () => {
    jest.spyOn(prisma.staff, 'findMany').mockResolvedValue([
      { id: 'staff-1', basic_salary: 100000 }
    ] as any);
    jest.spyOn(prisma.payrollRecord, 'findUnique').mockResolvedValue(null);
    jest.spyOn(prisma.payrollRecord, 'create').mockResolvedValue({} as any);

    await service.processMonthlyPayroll(7, 2026);

    // Verify Journals
    expect(prisma.journalEntry.createMany).toHaveBeenCalled();
    const journalCall = (prisma.journalEntry.createMany as jest.Mock).mock.calls[0][0];
    const entries = journalCall.data;

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    // Accounting equation: Total Debits MUST equal Total Credits
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
    
    // Verify specific accounts were hit
    expect(entries.find(e => e.account_code === '6000_SALARY_EXPENSE')).toBeDefined();
    expect(entries.find(e => e.account_code === '1010_BANK_CASH')).toBeDefined();
    expect(entries.find(e => e.account_code === '2100_PAYE_PAYABLE')).toBeDefined();
  });
});