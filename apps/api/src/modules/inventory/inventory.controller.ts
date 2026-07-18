// apps/api/src/modules/inventory/inventory.controller.ts
import { Controller, Post, Body, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Inventory & Procurement')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('requisitions')
  @Permissions('inventory:requisition:create')
  @AuditEntity('Requisition')
  async createReq(@Body() body: { item_id: string, quantity: number, justification: string }, @Request() req) {
    return this.inventoryService.createRequisition(body.item_id, body.quantity, body.justification, req.user.id);
  }

  @Post('requisitions/:id/approve')
  @Permissions('inventory:requisition:approve') // Finance/Admin only
  @AuditEntity('Requisition')
  async approveReq(@Param('id') id: string, @Body() body: { supplier_id: string, unit_cost: number }, @Request() req) {
    return this.inventoryService.approveRequisitionAndCreatePO(id, body.supplier_id, body.unit_cost, req.user.id);
  }

  @Post('purchase-orders/:id/receive')
  @Permissions('inventory:po:receive')
  @AuditEntity('PurchaseOrder')
  async receivePO(@Param('id') id: string, @Body() body: { items: { po_item_id: string, received_qty: number }[] }) {
    return this.inventoryService.receivePurchaseOrder(id, body.items);
  }
}