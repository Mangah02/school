// apps/api/src/modules/finance/waiver.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { WaiverService } from './waiver.service';
import { RequestWaiverDto, ProcessWaiverDto } from './dto/fee-waiver.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@ApiTags('Finance - Waivers')
@Controller('finance/waivers')
@UseGuards(JwtAuthGuard)
export class WaiverController {
  constructor(private readonly waiverService: WaiverService) {}

  @Get('pending')
  @Permissions('finance:waiver:approve')
  @ApiOperation({ summary: 'Get pending waivers for approval based on user role' })
  async getPending(@Req() req: Request & { user: any }) {
    return this.waiverService.getPendingWaivers(req.user.school_id, req.user.role);
  }

  @Get('my-requests')
  @Permissions('finance:waiver:request')
  @ApiOperation({ summary: 'Get waivers requested by the current user' })
  async getMyRequests(@Req() req: Request & { user: any }) {
    return this.waiverService.getMyRequests(req.user.school_id, req.user.id);
  }

  @Post('request')
  @Permissions('finance:waiver:request')
  @AuditEntity('FeeWaiver')
  @ApiOperation({ summary: 'Request a new fee waiver' })
  async request(@Req() req: Request & { user: any }, @Body() dto: RequestWaiverDto) {
    return this.waiverService.requestWaiver(dto, req.user.id, req.user.school_id);
  }

  @Post('process')
  @Permissions('finance:waiver:approve')
  @AuditEntity('FeeWaiver')
  @ApiOperation({ summary: 'Approve or reject a pending fee waiver' })
  async process(@Req() req: Request & { user: any }, @Body() dto: ProcessWaiverDto) {
    return this.waiverService.processWaiver(dto, req.user.id, req.user.role, req.user.school_id);
  }
}