// apps/api/src/modules/ai/ai-quota.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CommunicationService } from '../communication/communication.service';

@Injectable()
export class AiQuotaService {
  private readonly logger = new Logger(AiQuotaService.name);
  private readonly MONTHLY_CAP_KES = 5000;
  private readonly ALERT_THRESHOLD = 0.80; // 80%

  constructor(
    private prisma: PrismaService,
    private commsService: CommunicationService,
  ) {}

  /**
   * REQ-RATE-001/002: Checks current spend and enforces the hard cap.
   * Returns the allowed provider ('ANTHROPIC' or forced 'OLLAMA' if capped).
   */
  async checkAndEnforceQuota(schoolId: string, estimatedCost: number): Promise<{ allowedProvider: string, currentSpend: number }> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Calculate current month's spend from the immutable AiUsageLog
    const spendAggregate = await this.prisma.aiUsageLog.aggregate({
      where: {
        school_id: schoolId,
        created_at: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 0, 23, 59, 59),
        }
      },
      _sum: { estimated_cost: true }
    });

    const currentSpend = spendAggregate._sum.estimated_cost || 0;
    const projectedSpend = currentSpend + estimatedCost;

    // 2. REQ-RATE-002: Hard Cap Enforcement (Graceful Degradation)
    if (projectedSpend > this.MONTHLY_CAP_KES) {
      this.logger.warn(`School ${schoolId} exceeded AI cap. Projected: ${projectedSpend}. Forcing Ollama.`);
      return { allowedProvider: 'OLLAMA', currentSpend };
    }

    // 3. REQ-RATE-001: 80% Alert Trigger
    if (currentSpend >= (this.MONTHLY_CAP_KES * this.ALERT_THRESHOLD)) {
      await this.triggerQuotaAlert(schoolId, currentMonth, currentYear, currentSpend);
    }

    return { allowedProvider: 'ANTHROPIC', currentSpend }; // Default to cloud if under cap
  }

  private async triggerQuotaAlert(schoolId: string, month: number, year: number, currentSpend: number) {
    // Prevent duplicate alerts for the same month
    const existingAlert = await this.prisma.aiQuotaAlert.findUnique({
      where: { school_id_month_year: { school_id: schoolId, month, year } }
    });

    if (!existingAlert) {
      await this.prisma.aiQuotaAlert.create({
        data: { school_id: schoolId, month, year }
      });

      // Notify School Admin via Email/SMS
      this.logger.log(`Triggering 80% AI Quota Alert for School ${schoolId}`);
      try {
        await this.commsService.dispatchEmail({
          recipient_type: 'SCHOOL_ADMINS', // Handled internally by comms service
          subject: 'Action Required: AI Usage Approaching Monthly Limit',
          body: `<p>Your school's AI usage has reached KES ${currentSpend.toFixed(2)} (80% of the KES 5,000 monthly limit). Further requests will be routed to the local offline model.</p>`
        }, 'SYSTEM_AI_GOVERNANCE');
      } catch (error) {
        this.logger.error(`Failed to send AI quota alert: ${error.message}`);
      }
    }
  }
}