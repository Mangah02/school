// apps/api/src/modules/finance/__tests__/invoicing.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { InvoicingService } from '../invoicing.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('InvoicingService - Double Entry & FIFO (7.1 & 7.2)', () => {
  let service: InvoicingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicingService,
        { provide: PrismaService, useValue: {
          feeStructure: { findFirst: jest.fn() },
          student: { findMany: jest.fn() },
          invoice: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
          journalEntry: { createMany: jest.fn() },
          payment: { create: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
        }},
      ],
    }).compile();

    service = module.get<InvoicingService>(InvoicingService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should generate double-entry journal lines when creating an invoice', async () => {
    jest.spyOn(prisma.feeStructure, 'findFirst').mockResolvedValue({ 
      id: 'fs-1', term_id: 't-1', total_amount: 10000, categories: [] 
    } as any);
    jest.spyOn(prisma.student, 'findMany').mockResolvedValue([
      { id: 'stu-1', first_name: 'John', last_name: 'Doe', stream: { class_id: 'c-1' } }
    ] as any);
    jest.spyOn(prisma.invoice, 'findFirst').mockResolvedValue(null);
    jest.spyOn(prisma.invoice, 'create').mockResolvedValue({ id: 'inv-1', total_amount: 10000 } as any);

    await service.generateClassInvoices({ fee_structure_id: 'fs-1', class_id: 'c-1', due_date: '2026-12-31' } as any);

    // Verify Double Entry: Debit 10000, Credit 10000
    expect(prisma.journalEntry.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ account_code: '1000_FEE_RECEIVABLE', debit: 10000, credit: 0 }),
        expect.objectContaining({ account_code: '4000_FEE_INCOME', debit: 0, credit: 10000 })
      ])
    }));
  });

  it('should enforce FIFO allocation across multiple outstanding invoices', async () => {
    // Student has Invoice A (5000 due) and Invoice B (3000 due). Total outstanding = 8000.
    jest.spyOn(prisma.invoice, 'findMany').mockResolvedValue([
      { id: 'inv-A', total_amount: 5000, paid_amount: 0, waived_amount: 0, created_at: new Date('2026-01-01') },
      { id: 'inv-B', total_amount: 3000, paid_amount: 0, waived_amount: 0, created_at: new Date('2026-02-01') }
    ] as any);

    // Mock recordPayment to just track calls instead of running full DB logic
    const recordSpy = jest.spyOn(service, 'recordPayment').mockResolvedValue({ success: true, new_balance: 0 } as any);

    // Parent pays 6000 KES in bulk
    await service.allocateUnallocatedPayment('stu-1', 6000, 'MPESA', 'REF123');

    // Verify FIFO: 5000 applied to Inv A, 1000 applied to Inv B
    expect(recordSpy).toHaveBeenCalledTimes(2);
    expect(recordSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({ invoice_id: 'inv-A', amount: 5000 }), 'SYSTEM_FIFO');
    expect(recordSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({ invoice_id: 'inv-B', amount: 1000 }), 'SYSTEM_FIFO');
  });

  it('should reject payment if amount exceeds outstanding balance', async () => {
    jest.spyOn(prisma.invoice, 'findFirst').mockResolvedValue({ 
      id: 'inv-1', total_amount: 10000, paid_amount: 8000, waived_amount: 0 
    } as any);

    const dto = { invoice_id: 'inv-1', amount: 3000, method: 'CASH', reference: 'REF' };
    
    await expect(service.recordPayment(dto as any, 'user-1')).rejects.toThrow(BadRequestException);
  });
});