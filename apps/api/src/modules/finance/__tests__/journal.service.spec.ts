// apps/api/src/modules/finance/__tests__/journal.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JournalService } from '../journal.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('JournalService - Immutable Reversals (7.7)', () => {
  let service: JournalService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalService,
        { provide: PrismaService, useValue: {
          journalEntry: { findMany: jest.fn(), findFirst: jest.fn(), createMany: jest.fn() },
          auditLog: { create: jest.fn() },
        }},
      ],
    }).compile();

    service = module.get<JournalService>(JournalService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should swap debits and credits when reversing a transaction', async () => {
    const originalEntries = [
      { transaction_id: 'tx-1', account_code: '1050_MPESA', debit: 5000, credit: 0, description: 'Fee' },
      { transaction_id: 'tx-1', account_code: '1000_RECEIVABLE', debit: 0, credit: 5000, description: 'Fee' }
    ];
    
    jest.spyOn(prisma.journalEntry, 'findMany').mockResolvedValue(originalEntries as any);
    jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(null); // Not already reversed
    jest.spyOn(prisma.journalEntry, 'createMany').mockResolvedValue({} as any);

    await service.reverseTransaction({ original_transaction_id: 'tx-1', reason: 'Wrong student' }, 'user-1');

    expect(prisma.journalEntry.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        // Original was Debit 5000, Reversal must be Credit 5000
        expect.objectContaining({ account_code: '1050_MPESA', debit: 0, credit: 5000, reverses_transaction_id: 'tx-1' }),
        // Original was Credit 5000, Reversal must be Debit 5000
        expect.objectContaining({ account_code: '1000_RECEIVABLE', debit: 5000, credit: 0, reverses_transaction_id: 'tx-1' })
      ])
    }));
  });

  it('should throw BadRequestException if transaction is already reversed', async () => {
    jest.spyOn(prisma.journalEntry, 'findMany').mockResolvedValue([{ transaction_id: 'tx-1' }] as any);
    jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue({ id: 'rev-1' } as any); // Already reversed

    await expect(service.reverseTransaction({ original_transaction_id: 'tx-1', reason: 'Test' }, 'user-1'))
      .rejects.toThrow(BadRequestException);
  });
});