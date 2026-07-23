// apps/api/src/modules/finance/finance.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { FeeStructureService } from './fee-structure.service';
import { InvoicingService } from './invoicing.service';
import { ReconciliationService } from './reconciliation.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@ApiTags('Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    private readonly feeStructureService: FeeStructureService,
    private readonly invoicingService: InvoicingService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  // --- RECONCILIATION ---
  @Get('reconciliation/pending')
  @Permissions('finance:reconciliation:view')
  @ApiOperation({ summary: 'Get pending payments requiring manual reconciliation' })
  async getPendingReconciliations(@Req() req: Request & { user: any }) {
    return this.reconciliationService.getPendingReconciliations(req.user.school_id);
  }

  @Post('reconciliation/confirm')
  @Permissions('finance:reconciliation:confirm')
  @AuditEntity('Payment')
  @ApiOperation({ summary: 'Manually confirm a stuck MPESA payment' })
  async confirmPayment(
    @Req() req: Request & { user: any },
    @Body() body: { payment_id: string; mpesa_receipt: string; justification: string }
  ) {
    return this.reconciliationService.confirmPayment(
      req.user.school_id,
      body.payment_id,
      body.mpesa_receipt,
      body.justification,
      req.user.id
    );
  }

  @Post('reconciliation/reject')
  @Permissions('finance:reconciliation:reject')
  @AuditEntity('Payment')
  @ApiOperation({ summary: 'Reject a stuck payment' })
  async rejectPayment(
    @Req() req: Request & { user: any },
    @Body() body: { payment_id: string; reason: string }
  ) {
    return this.reconciliationService.rejectPayment(
      req.user.school_id,
      body.payment_id,
      body.reason,
      req.user.id
    );
  }

  // --- FEE STRUCTURES & INVOICING ---
  @Post('structures')
  @Permissions('finance:structure:create')
  @AuditEntity('FeeStructure')
  @ApiOperation({ summary: 'Create a new fee structure' })
  async createStructure(@Body() dto: CreateFeeStructureDto) {
    return this.feeStructureService.create(dto);
  }

  @Post('invoices/generate')
  @Permissions('finance:invoice:generate')
  @AuditEntity('Invoice')
  @ApiOperation({ summary: 'Generate invoices for a class' })
  async generateInvoices(@Body() dto: GenerateInvoicesDto) {
    return this.invoicingService.generateClassInvoices(dto);
  }

  @Post('payments')
  @Permissions('finance:payment:record')
  @AuditEntity('Payment')
  @ApiOperation({ summary: 'Record a manual payment' })
  async recordPayment(@Body() dto: RecordPaymentDto, @Req() req: Request & { user: any }) {
    return this.invoicingService.recordPayment(dto, req.user.id);
  }

  @Post('payments/fifo-allocate')
  @Permissions('finance:payment:record')
  @AuditEntity('Payment')
  @ApiOperation({ summary: 'Allocate unallocated payment using FIFO' })
  async allocatePayment(@Body() body: { student_id: string; amount: number; method: string; reference: string }) {
    return this.invoicingService.allocateUnallocatedPayment(
      body.student_id, body.amount, body.method, body.reference
    );
  }
}