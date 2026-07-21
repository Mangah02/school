// apps/api/src/modules/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnomalyService } from './anomaly.service'; // ✅ Import AnomalyService

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnomalyService, // ✅ MUST be listed here for AnalyticsController to inject it
  ],
})
export class AnalyticsModule {}