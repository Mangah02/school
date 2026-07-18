// apps/api/src/modules/finance/__tests__/reconciliation.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from '../reconciliation.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('ReconciliationService - Manual Confirm (7.5)', () => {
  let service: ReconciliationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: {
          payment: { findFirst: jest.fn(), update: jest.fn() },
          invoice: { update: jest.fn() }, // via transaction
          journalEntry: { createMany: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
        }},
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should post journals and update invoice on manual confirmation', async () => {
    const mockPayment = {
      id: 'pay-1', invoice_id: 'inv-1', amount: 5000, mpesa_state: 'RECONCILING',
      invoice: { paid_amount: 0, total_amount: 5000 }
    };
    jest.spyOn(prisma.payment, 'findFirst').mockResolvedValue(mockPayment as any);
    jest.spyOn(prisma.payment, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.invoice, 'update').mockResolvedValue({} as any); // via transaction

    const dto = { payment_id: 'pay-1', mpesa_receipt: 'ABC1234567', justification: 'Confirmed via SMS' };
    await service.manualConfirm(dto as any, 'fo-1');

    expect(prisma.journalEntry.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ account_code: '1050_MPESA_CLEARING', debit: 5000 }),
        expect.objectContaining({ account_code: '1000_FEE_RECEIVABLE', credit: 5000 })
      ])
    }));
  });
});