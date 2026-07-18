// apps/api/src/modules/billing/subscription.service.ts
import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Middleware/Guard helper: Checks if the school's subscription is valid.
   * Enforces grace period and suspension logic.
   */
  async validateSubscription(schoolId: string) {
    const subscription = await this.prisma.schoolSubscription.findUnique({
      where: { school_id: schoolId }
    });

    if (!subscription) {
      throw new ForbiddenException('No active subscription found for this school.');
    }

    const now = new Date();

    if (subscription.status === 'SUSPENDED') {
      throw new ForbiddenException('School account is suspended. Please contact support to renew.');
    }

    if (subscription.status === 'GRACE_PERIOD') {
      if (subscription.grace_period_ends_at && now > subscription.grace_period_ends_at) {
        // Auto-suspend if grace period expires
        await this.prisma.school.update({
          where: { id: schoolId },
          data: { is_active: false }
        });
        await this.prisma.schoolSubscription.update({
          where: { school_id: schoolId },
          data: { status: 'SUSPENDED' }
        });
        throw new ForbiddenException('Grace period expired. Account suspended.');
      }
      // Allow access but log warning (frontend can show a banner)
      return { valid: true, isGracePeriod: true };
    }

    if (now > subscription.current_period_end && subscription.status === 'ACTIVE') {
      // Transition to grace period (e.g., 14 days)
      const graceEnd = new Date();
      graceEnd.setDate(graceEnd.getDate() + 14);
      
      await this.prisma.schoolSubscription.update({
        where: { school_id: schoolId },
        data: { 
          status: 'GRACE_PERIOD', 
          grace_period_ends_at: graceEnd 
        }
      });
      return { valid: true, isGracePeriod: true };
    }

    return { valid: true, isGracePeriod: false };
  }

  async updatePlan(schoolId: string, newTier: string, externalCustomerId: string) {
    return this.prisma.schoolSubscription.upsert({
      where: { school_id: schoolId },
      update: { 
        plan_tier: newTier, 
        external_customer_id: externalCustomerId,
        status: 'ACTIVE',
        grace_period_ends_at: null
      },
      create: {
        school_id: schoolId,
        plan_tier: newTier,
        status: 'ACTIVE',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        external_customer_id: externalCustomerId,
      }
    });
  }
}