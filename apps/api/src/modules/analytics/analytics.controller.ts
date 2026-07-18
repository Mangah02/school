// apps/api/src/modules/analytics/analytics.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnomalyService } from './anomaly.service';
import { Permissions } from '../../core/guards/permissions.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Analytics & Reporting')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly anomalyService: AnomalyService,
  ) {}

  @Get('dashboard')
  @Permissions('analytics:dashboard:view')
  async getDashboard() {
    return this.analyticsService.getSchoolDashboardKpis();
  }

  @Get('anomalies/finance')
  @Permissions('analytics:anomaly:view') // DPO / Principal / Finance Officer
  async getFinancialAnomalies() {
    return this.anomalyService.detectFinancialAnomalies();
  }
}