// apps/api/src/modules/analytics/analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SuperAdminPrismaService } from '../../core/prisma/super-admin.prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private superAdminPrisma: SuperAdminPrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Aggregates cross-module KPIs for the School Admin Dashboard.
   * Uses optimized Prisma aggregates backed by the partial indexes defined in Phase 3.
   */
  async getSchoolDashboardKpis() {
    const context = tenantStorage.getStore();
    if (!context?.schoolId) {
      throw new Error('Tenant context missing');
    }

    // Run queries in parallel for performance
    const [
      studentStats,
      financeStats,
      attendanceStats,
      staffCount
    ] = await Promise.all([
      // Student Stats
      this.prisma.student.count({
        where: { school_id: context.schoolId, is_deleted: false }
      }),
      
      // Finance Stats (Current Term)
      this.prisma.invoice.aggregate({
        where: { school_id: context.schoolId, status: { not: 'VOID' } },
        _sum: { total_amount: true, paid_amount: true },
      }),

      // Today's Attendance
      this.prisma.attendanceRecord.count({
        where: { 
          school_id: context.schoolId, 
          date: new Date(), 
          status: 'PRESENT' 
        }
      }),

      // Staff Count
      this.prisma.staff.count({
        where: { school_id: context.schoolId, is_deleted: false }
      })
    ]);

    const totalInvoiced = financeStats._sum.total_amount || 0;
    const totalCollected = financeStats._sum.paid_amount || 0;
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    return {
      total_students: studentStats,
      total_staff: staffCount,
      attendance_today: attendanceStats,
      finance: {
        total_invoiced: totalInvoiced,
        total_collected: totalCollected,
        outstanding_balance: totalInvoiced - totalCollected,
        collection_rate_percent: parseFloat(collectionRate.toFixed(2))
      }
    };
  }

  /**
   * Super Admin Global Analytics
   * This query bypasses RLS and is manually audit-logged (replacing the broken middleware).
   */
  async getGlobalStudentCount() {
    const context = tenantStorage.getStore();
    
    // 1. Perform the cross-school query
    const studentCount = await this.superAdminPrisma.client.student.count({
      where: { is_deleted: false }
    });

    // 2. Manually log the Super Admin action
    this.auditService.logAction({
      school_id: null, // Cross-school
      user_id: context?.userId || null,
      action: 'SUPER_ADMIN_VIEW_GLOBAL_STATS',
      entity_type: 'Student',
      entity_id: null,
      after_state: { count: studentCount },
      ip_address: 'SYSTEM',
    } as any);

    return { totalStudents: studentCount };
  }

  /**
   * Detects financial anomalies: specifically, a sudden spike in Fee Waivers 
   * compared to the historical average, which could indicate fraud or system abuse.
   */
  async detectFinancialAnomalies() {
    const context = tenantStorage.getStore();
    if (!context?.schoolId) {
      throw new Error('Tenant context missing');
    }
    
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

    // 3. Anomaly Logic: If current month is > 50% of the historical average (and average is > 0)
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
          } as any // Cast to any to satisfy Prisma's strict JSON typing
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