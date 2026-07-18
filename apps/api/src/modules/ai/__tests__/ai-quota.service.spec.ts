// apps/api/src/modules/ai/__tests__/ai-quota.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AiQuotaService } from '../ai-quota.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CommunicationService } from '../../communication/communication.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('AiQuotaService - Cost Governance (8.6)', () => {
  let service: AiQuotaService;
  let prisma: PrismaService;
  let comms: CommunicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiQuotaService,
        { provide: PrismaService, useValue: {
          aiUsageLog: { aggregate: jest.fn() },
          aiQuotaAlert: { findUnique: jest.fn(), create: jest.fn() },
        }},
        { provide: CommunicationService, useValue: { dispatchEmail: jest.fn() } },
      ],
    }).compile();

    service = module.get<AiQuotaService>(AiQuotaService);
    prisma = module.get<PrismaService>(PrismaService);
    comms = module.get<CommunicationService>(CommunicationService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should force OLLAMA if projected spend exceeds KES 5,000 cap', async () => {
    // Current spend is 4,950. Estimated cost of new request is 100. Total = 5,050.
    jest.spyOn(prisma.aiUsageLog, 'aggregate').mockResolvedValue({ _sum: { estimated_cost: 4950 } } as any);

    const result = await service.checkAndEnforceQuota('sch-1', 100);

    expect(result.allowedProvider).toBe('OLLAMA');
    expect(result.currentSpend).toBe(4950);
  });

  it('should allow ANTHROPIC if under cap, but trigger 80% alert if applicable', async () => {
    // Current spend is 4,100 (82% of 5000). Estimated cost is 50. Total = 4,150.
    jest.spyOn(prisma.aiUsageLog, 'aggregate').mockResolvedValue({ _sum: { estimated_cost: 4100 } } as any);
    jest.spyOn(prisma.aiQuotaAlert, 'findUnique').mockResolvedValue(null); // No alert sent yet this month

    const result = await service.checkAndEnforceQuota('sch-1', 50);

    expect(result.allowedProvider).toBe('ANTHROPIC');
    expect(prisma.aiQuotaAlert.create).toHaveBeenCalled();
    expect(comms.dispatchEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining('AI Usage Approaching')
    }), 'SYSTEM_AI_GOVERNANCE');
  });

  it('should NOT trigger duplicate alerts for the same month', async () => {
    jest.spyOn(prisma.aiUsageLog, 'aggregate').mockResolvedValue({ _sum: { estimated_cost: 4500 } } as any);
    jest.spyOn(prisma.aiQuotaAlert, 'findUnique').mockResolvedValue({ id: 'alert-1' } as any); // Alert already exists

    await service.checkAndEnforceQuota('sch-1', 10);

    expect(prisma.aiQuotaAlert.create).not.toHaveBeenCalled();
    expect(comms.dispatchEmail).not.toHaveBeenCalled();
  });
});