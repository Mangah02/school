// apps/api/src/modules/finance/__tests__/mpesa.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MpesaService } from '../mpesa.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('MpesaService - Idempotency & State Machine (7.3 & 7.4)', () => {
  let service: MpesaService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MpesaService,
        { provide: PrismaService, useValue: {
          invoice: { findFirst: jest.fn() },
          payment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
          journalEntry: { createMany: jest.fn() },
        }},
        { provide: 'BullQueue_mpesa-stk', useValue: { add: jest.fn() } },
        { provide: 'ConfigService', useValue: { get: jest.fn().mockReturnValue('mock_config') } },
      ],
    }).compile();

    service = module.get<MpesaService>(MpesaService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should process callback successfully and post double-entry journals', async () => {
    const mockPayment = {
      id: 'pay-1',
      school_id: 'sch-1',
      invoice_id: 'inv-1',
      amount: 5000,
      mpesa_state: 'PENDING',
      invoice: { paid_amount: 0, total_amount: 5000 }
    };

    jest.spyOn(prisma.payment, 'findUnique').mockResolvedValue(mockPayment as any);
    jest.spyOn(prisma.payment, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.invoice, 'update').mockResolvedValue({} as any); // Mocked via transaction

    const dto = {
      CheckoutRequestID: 'chk-123',
      ResultCode: 0,
      ResultDesc: 'Success',
      CallbackMetadata: { Item: [{ Name: 'MpesaReceiptNumber', Value: 'ABC123' }] }
    };

    const result = await service.processCallback(dto as any);

    expect(result.ResultCode).toBe(0);
    expect(prisma.journalEntry.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ account_code: '1050_MPESA_CLEARING', debit: 5000 }),
        expect.objectContaining({ account_code: '1000_FEE_RECEIVABLE', credit: 5000 })
      ])
    }));
  });

  it('should be strictly idempotent: ignore duplicate SUCCESS callbacks', async () => {
    const mockPayment = { id: 'pay-1', mpesa_state: 'SUCCESS' };
    jest.spyOn(prisma.payment, 'findUnique').mockResolvedValue(mockPayment as any);

    const dto = { CheckoutRequestID: 'chk-123', ResultCode: 0, ResultDesc: 'Success' };
    const result = await service.processCallback(dto as any);

    expect(result.ResultCode).toBe(0);
    // Ensure no DB updates happened
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.journalEntry.createMany).not.toHaveBeenCalled();
  });

  it('should handle FAILED callbacks without posting journals', async () => {
    const mockPayment = { id: 'pay-1', mpesa_state: 'PENDING', invoice: {} };
    jest.spyOn(prisma.payment, 'findUnique').mockResolvedValue(mockPayment as any);
    jest.spyOn(prisma.payment, 'update').mockResolvedValue({} as any);

    const dto = { CheckoutRequestID: 'chk-123', ResultCode: 1032, ResultDesc: 'Request cancelled by user' };
    await service.processCallback(dto as any);

    expect(prisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ mpesa_state: 'FAILED' })
    }));
    expect(prisma.journalEntry.createMany).not.toHaveBeenCalled();
  });
});