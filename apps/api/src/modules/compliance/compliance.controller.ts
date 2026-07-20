// apps/api/src/modules/compliance/compliance.controller.ts
import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { DsarService } from './dsar.service';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('KDPA Compliance & DSAR')
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly dsarService: DsarService) {}

  @Get('dsar/export')
  @Permissions('compliance:dsar:export') // DPO / Admin
  async exportData(@Query('entity_type') entityType: string, @Query('entity_id') entityId: string) {
    return this.dsarService.exportData(entityType, entityId);
  }

  @Post('dsar/deletion/request')
  @Permissions('compliance:dsar:request') // Parents/Admins can request
  @AuditEntity('DeletionRequest')
  async requestDeletion(
    @Body() body: { entity_type: string, entity_id: string, reason: string },
    @Req() req: any // Using @Req() avoids the global 'Request' type collision
  ) {
    // req.user is populated by the JwtAuthGuard
    return this.dsarService.requestDeletion(body.entity_type, body.entity_id, body.reason, req.user.id);
  }

  @Post('dsar/deletion/:id/execute')
  @Permissions('compliance:dsar:execute') // STRICTLY DPO / Principal
  @AuditEntity('DeletionRequest')
  async executeDeletion(@Param('id') id: string, @Req() req: any) {
    return this.dsarService.processDeletion(id, req.user.id);
  }
}