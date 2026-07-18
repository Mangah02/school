// apps/api/src/modules/analytics/anomaly.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Detects financial anomalies: specifically, a sudden spike in Fee Waivers 
   * compared to the historical average, which could indicate fraud or system abuse.
   */
  async detectFinancialAnomalies() {
    const context = tenantStorage.getStore();
    const now = new Date();
    
    // 1. Get current month's waivers
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentWaivers = await this.prisma.feeWaiver.aggregate({
      where: {
        school_id: context.schoolId,
        status: 'APPROVED',
        created_at: { gte: currentMonthStart }
      },
      _sum: { waiver_amount: true }
    });
    const currentWaiverTotal = currentWaivers._sum.waiver_amount || 0;

    // 2. Get previous 3 months' average
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const historicalWaivers = await this.prisma.feeWaiver.aggregate({
      where: {
        school_id: context.schoolId,
        status: 'APPROVED',
        created_at: { gte: threeMonthsAgo, lt: currentMonthStart }
      },
      _sum: { waiver_amount: true },
      _count: true
    });

    const historicalTotal = historicalWaivers._sum.waiver_amount || 0;
    const monthsCounted = historicalWaivers._count > 0 ? historicalWaivers._count : 1;
    const historicalAverage = historicalTotal / monthsCounted;

    // 3. Anomaly Logic: If current month is > 150% of the historical average (and average is > 0)
    let anomalyDetected = false;
    let deviationPercent = 0;

    if (historicalAverage > 0) {
      deviationPercent = ((currentWaiverTotal - historicalAverage) / historicalAverage) * 100;
      if (deviationPercent > 50) { // 50% spike threshold
        anomalyDetected = true;
        this.logger.warn(`FINANCIAL ANOMALY DETECTED: School ${context.schoolId} waivers spiked by ${deviationPercent.toFixed(2)}%`);
        
        // Log to Audit for DPO/Principal review
        await this.prisma.auditLog.create({
          data: {
            school_id: context.schoolId,
            action: 'ANOMALY_DETECTED',
            entity_type: 'FinancialWaiver',
            new_values: { 
              current_month_total: currentWaiverTotal, 
              historical_avg: historicalAverage, 
              deviation_percent: deviationPercent 
            }
          }
        });
      }
    }

    return {
      current_month_waivers: currentWaiverTotal,
      historical_3mo_average: historicalAverage,
      deviation_percent: parseFloat(deviationPercent.toFixed(2)),
      anomaly_detected: anomalyDetected
    };
  }
}