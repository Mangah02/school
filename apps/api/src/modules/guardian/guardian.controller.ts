// apps/api/src/modules/guardian/guardian.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { GuardianService } from './guardian.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';

@ApiTags('Guardians')
@Controller('guardians')
@UseGuards(JwtAuthGuard)
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @Get()
  @ApiOperation({ summary: 'Get all guardians for the school' })
  async getGuardians(@Req() req: Request & { user: any }) {
    return this.guardianService.getGuardians(req.user.school_id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new guardian' })
  async createGuardian(@Req() req: Request & { user: any }, @Body() body: any) {
    return this.guardianService.createGuardian(req.user.school_id, body);
  }
}