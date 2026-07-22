// apps/api/src/modules/analytics/analytics.controller.ts
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Adjust path if needed
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get school dashboard KPIs' })
  async getDashboard(@Req() req: Request & { user: any }) {
    // ✅ Pass the school_id directly from the authenticated user's JWT
    return this.analyticsService.getSchoolDashboardKpis(req.user.school_id);
  }

  @Get('anomalies/finance')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detect financial anomalies' })
  async detectAnomalies(@Req() req: Request & { user: any }) {
    return this.analyticsService.detectFinancialAnomalies(req.user.school_id);
  }
}