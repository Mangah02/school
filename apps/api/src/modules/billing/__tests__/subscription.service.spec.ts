// apps/api/src/modules/billing/__tests__/subscription.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from '../subscription.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('SubscriptionService - Grace Period & Suspension (10.1)', () => {
  let service: SubscriptionService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: {
          schoolSubscription: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
          school: { update: jest.fn() },
        }},
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should auto-suspend school if grace period has expired', async () => {
    const expiredDate = new Date(Date.now() - 86400000); // Yesterday
    jest.spyOn(prisma.schoolSubscription, 'findUnique').mockResolvedValue({
      status: 'GRACE_PERIOD',
      grace_period_ends_at: expiredDate,
      school_id: 'sch-1'
    } as any);

    await expect(service.validateSubscription('sch-1')).rejects.toThrow(ForbiddenException);
    expect(prisma.school.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { is_active: false }
    }));
    expect(prisma.schoolSubscription.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'SUSPENDED' }
    }));
  });

  it('should transition to grace period if active subscription expires', async () => {
    const expiredDate = new Date(Date.now() - 86400000);
    jest.spyOn(prisma.schoolSubscription, 'findUnique').mockResolvedValue({
      status: 'ACTIVE',
      current_period_end: expiredDate,
      school_id: 'sch-1'
    } as any);

    const result = await service.validateSubscription('sch-1');
    expect(result.isGracePeriod).toBe(true);
    expect(prisma.schoolSubscription.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'GRACE_PERIOD' }
    }));
  });
});