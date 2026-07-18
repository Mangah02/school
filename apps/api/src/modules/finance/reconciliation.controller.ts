// apps/api/src/modules/finance/reconciliation.controller.ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { ManualConfirmPaymentDto, RejectPaymentDto } from './dto/reconciliation.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Finance - Reconciliation')
@Controller('finance/reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('pending')
  @Permissions('finance:reconciliation:view')
  async getPending() {
    return this.reconciliationService.getReconcilingPayments();
  }

  @Post('confirm')
  @Permissions('finance:reconciliation:confirm')
  @AuditEntity('Payment')
  async confirm(@Body() dto: ManualConfirmPaymentDto, @Request() req) {
    return this.reconciliationService.manualConfirm(dto, req.user.id);
  }

  @Post('reject')
  @Permissions('finance:reconciliation:confirm')
  @AuditEntity('Payment')
  async reject(@Body() dto: RejectPaymentDto, @Request() req) {
    return this.reconciliationService.rejectPayment(dto, req.user.id);
  }

  @Get('daily-report')
  @Permissions('finance:reconciliation:view')
  async getDailyReport(@Query('date') date: string) {
    return this.reconciliationService.generateDailyReport(date);
  }
}