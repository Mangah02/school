// apps/api/src/modules/finance/reconciliation.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@ApiTags('Finance - Reconciliation')
@Controller('finance/reconciliation')
@UseGuards(JwtAuthGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('pending')
  @Permissions('finance:reconciliation:view')
  @ApiOperation({ summary: 'Get pending payments requiring manual reconciliation' })
  async getPending(@Req() req: Request & { user: any }) {
    return this.reconciliationService.getPendingReconciliations(req.user.school_id);
  }

  @Post('confirm')
  @Permissions('finance:reconciliation:confirm')
  @AuditEntity('Payment')
  @ApiOperation({ summary: 'Manually confirm a stuck MPESA payment' })
  async confirm(
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

  @Post('reject')
  @Permissions('finance:reconciliation:reject')
  @AuditEntity('Payment')
  @ApiOperation({ summary: 'Reject a stuck payment' })
  async reject(
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
}