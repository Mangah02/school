// apps/api/src/modules/inventory/inventory.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common'; // ✅ Added UnauthorizedException
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async createRequisition(itemId: string, quantity: number, justification: string, userId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, school_id: context.schoolId, is_deleted: false }
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    return this.prisma.requisition.create({
      data: {
        school_id: context.schoolId,
        item_id: itemId,
        requested_by: userId,
        quantity,
        justification,
        status: 'PENDING'
      }
    });
  }

  async approveRequisitionAndCreatePO(requisitionId: string, supplierId: string, unitCost: number, approverId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    return this.prisma.$transaction(async (tx) => {
      const req = await tx.requisition.findFirst({
        where: { id: requisitionId, school_id: context.schoolId, status: 'PENDING' }
      });
      if (!req) throw new BadRequestException('Requisition not found or already processed');

      // 1. Approve Requisition
      await tx.requisition.update({
        where: { id: requisitionId },
        data: { status: 'APPROVED', approved_by: approverId }
      });

      // 2. Create Purchase Order
      const totalAmount = req.quantity * unitCost;
      const po = await tx.purchaseOrder.create({
        data: {
          school_id: context.schoolId,
          requisition_id: requisitionId,
          supplier_id: supplierId,
          total_amount: totalAmount,
          status: 'DRAFT'
        }
      });

      // 3. Create PO Item Line
      await tx.purchaseOrderItem.create({
        data: {
          purchase_order_id: po.id,
          item_id: req.item_id,
          quantity: req.quantity,
          unit_cost: unitCost
        }
      });

      // 4. Update Requisition Status to PO_ISSUED
      await tx.requisition.update({
        where: { id: requisitionId },
        data: { status: 'PO_ISSUED' }
      });

      return { success: true, purchase_order_id: po.id };
    });
  }

  /**
   * Goods Received Note (GRN) - Updates inventory quantities upon delivery.
   */
  async receivePurchaseOrder(poId: string, receivedItems: { po_item_id: string, received_qty: number }[]) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id: poId, school_id: context.schoolId, status: { in: ['DRAFT', 'SENT'] } },
        include: { items: true }
      });
      if (!po) throw new BadRequestException('PO not found or already received');

      for (const rec of receivedItems) {
        const poItem = po.items.find(i => i.id === rec.po_item_id);
        if (!poItem) throw new NotFoundException('PO Item not found');

        // Update received quantity on the PO line
        await tx.purchaseOrderItem.update({
          where: { id: rec.po_item_id },
          data: { received_quantity: { increment: rec.received_qty } }
        });

        // Increment physical inventory count
        await tx.inventoryItem.update({
          where: { id: poItem.item_id },
          data: { quantity: { increment: rec.received_qty } }
        });
      }

      // Mark PO as fully received if all items match
      const allReceived = po.items.every(i => {
        const rec = receivedItems.find(r => r.po_item_id === i.id);
        return rec && rec.received_qty >= i.quantity;
      });

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: allReceived ? 'RECEIVED' : 'SENT' } // Simplified: partial receive keeps it SENT
      });

      return { success: true, message: 'Inventory updated successfully' };
    });
  }
}