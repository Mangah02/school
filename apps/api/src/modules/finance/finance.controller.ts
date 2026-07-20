// apps/api/src/modules/finance/finance.controller.ts
import { Controller, Post, Body, Get, Param, Query, Req } from '@nestjs/common'; // ✅ Import Req
import { FeeStructureService } from './fee-structure.service';
import { InvoicingService } from './invoicing.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Finance')
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly feeStructureService: FeeStructureService,
    private readonly invoicingService: InvoicingService,
  ) {}

  @Post('structures')
  @Permissions('finance:structure:create')
  @AuditEntity('FeeStructure')
  async createStructure(@Body() dto: CreateFeeStructureDto) {
    return this.feeStructureService.create(dto);
  }

  @Post('invoices/generate')
  @Permissions('finance:invoice:generate')
  @AuditEntity('Invoice')
  async generateInvoices(@Body() dto: GenerateInvoicesDto) {
    return this.invoicingService.generateClassInvoices(dto);
  }

  @Post('payments')
  @Permissions('finance:payment:record')
  @AuditEntity('Payment')
  async recordPayment(@Body() dto: RecordPaymentDto, @Req() req: any) { // ✅ Use @Req() and type as any
    return this.invoicingService.recordPayment(dto, req.user.id);
  }

  @Post('payments/fifo-allocate')
  @Permissions('finance:payment:record')
  @AuditEntity('Payment')
  async allocatePayment(@Body() body: { student_id: string, amount: number, method: string, reference: string }) {
    return this.invoicingService.allocateUnallocatedPayment(
      body.student_id, body.amount, body.method, body.reference
    );
  }
}