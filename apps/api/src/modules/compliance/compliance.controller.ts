// apps/api/src/modules/compliance/compliance.controller.ts
import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';

@ApiTags('KDPA Compliance & DSAR')
@Controller('compliance')
@UseGuards(JwtAuthGuard) // Protect all routes in this controller
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  // --- NEW KDPA CONSENT ENDPOINTS ---
  @Get('consent/status')
  @ApiOperation({ summary: 'Check user KDPA consent status' })
  async getConsentStatus(@Req() req: Request & { user: any }) {
    // ✅ Safely extract ID, checking both 'id' and 'sub'
    const userId = req.user.id || req.user.sub;
    const schoolId = req.user.school_id;

    console.log('🔍 [Compliance] getConsentStatus:', { userId, schoolId });

    if (!userId || !schoolId) {
      throw new UnauthorizedException('User or School ID missing from authentication token');
    }

    return this.complianceService.getConsentStatus(userId, schoolId);
  }

  @Post('consent/acknowledge')
  @ApiOperation({ summary: 'Acknowledge KDPA consent' })
  async acknowledgeConsent(@Req() req: Request & { user: any }, @Body() body: { category: string }) {
    // ✅ Safely extract ID, checking both 'id' and 'sub'
    const userId = req.user.id || req.user.sub;
    const schoolId = req.user.school_id;

    console.log('🔍 [Compliance] acknowledgeConsent called with:', { userId, schoolId, category: body.category });

    if (!userId || !schoolId) {
      throw new UnauthorizedException('User or School ID missing from authentication token');
    }

    return this.complianceService.acknowledgeConsent(userId, schoolId, body.category);
  }

  // --- EXISTING DSAR ENDPOINTS ---
  @Get('dsar/export')
  @Permissions('compliance:dsar:export')
  async exportData(@Query('entity_type') entityType: string, @Query('entity_id') entityId: string) {
    return this.complianceService.exportData(entityType, entityId);
  }

  @Post('dsar/deletion/request')
  @Permissions('compliance:dsar:request')
  @AuditEntity('DeletionRequest')
  async requestDeletion(
    @Body() body: { entity_type: string; entity_id: string; reason: string },
    @Req() req: Request & { user: any }
  ) {
    const userId = req.user.id || req.user.sub;
    return this.complianceService.requestDeletion(body.entity_type, body.entity_id, body.reason, userId);
  }

  @Post('dsar/deletion/:id/execute')
  @Permissions('compliance:dsar:execute')
  @AuditEntity('DeletionRequest')
  async executeDeletion(@Param('id') id: string, @Req() req: Request & { user: any }) {
    const userId = req.user.id || req.user.sub;
    return this.complianceService.processDeletion(id, userId);
  }
}