// apps/api/src/modules/inventory/__tests__/inventory.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from '../inventory.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('InventoryService - Requisition to PO Workflow (9.4)', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: {
          inventoryItem: { findFirst: jest.fn(), update: jest.fn() },
          requisition: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
          purchaseOrder: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
          purchaseOrderItem: { create: jest.fn(), update: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
        }},
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should create PO and update requisition status upon approval', async () => {
    jest.spyOn(prisma.requisition, 'findFirst').mockResolvedValue({ 
      id: 'req-1', item_id: 'item-1', quantity: 10, status: 'PENDING' 
    } as any);
    jest.spyOn(prisma.requisition, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.purchaseOrder, 'create').mockResolvedValue({ id: 'po-1' } as any);
    jest.spyOn(prisma.purchaseOrderItem, 'create').mockResolvedValue({} as any);

    const result = await service.approveRequisitionAndCreatePO('req-1', 'sup-1', 500, 'admin-1');

    expect(result.purchase_order_id).toBe('po-1');
    expect(prisma.purchaseOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ total_amount: 5000 }) // 10 * 500
    }));
    expect(prisma.requisition.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PO_ISSUED' })
    }));
  });

  it('should increment inventory quantity when PO is received', async () => {
    jest.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValue({ 
      id: 'po-1', status: 'SENT', items: [{ id: 'poi-1', item_id: 'item-1', quantity: 10 }] 
    } as any);
    jest.spyOn(prisma.purchaseOrderItem, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.inventoryItem, 'update').mockResolvedValue({} as any);
    jest.spyOn(prisma.purchaseOrder, 'update').mockResolvedValue({} as any);

    await service.receivePurchaseOrder('po-1', [{ po_item_id: 'poi-1', received_qty: 10 }]);

    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { quantity: { increment: 10 } }
    }));
  });
});