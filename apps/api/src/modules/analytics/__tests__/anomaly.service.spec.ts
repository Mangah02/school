// apps/api/src/modules/analytics/__tests__/anomaly.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyService } from '../anomaly.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('AnomalyService - Financial Spike Detection (8.8)', () => {
  let service: AnomalyService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyService,
        { provide: PrismaService, useValue: {
          feeWaiver: { aggregate: jest.fn() },
          auditLog: { create: jest.fn() },
        }},
      ],
    }).compile();

    service = module.get<AnomalyService>(AnomalyService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should detect an anomaly if current waivers spike > 50% above historical average', async () => {
    // Current month: 15,000 KES waived
    jest.spyOn(prisma.feeWaiver, 'aggregate').mockResolvedValueOnce({ _sum: { waiver_amount: 15000 } } as any);
    
    // Historical 3 months: 3,000 KES total (Average = 1,000 / month)
    jest.spyOn(prisma.feeWaiver, 'aggregate').mockResolvedValueOnce({ 
      _sum: { waiver_amount: 3000 }, 
      _count: 3 
    } as any);

    const result = await service.detectFinancialAnomalies();

    expect(result.anomaly_detected).toBe(true);
    expect(result.deviation_percent).toBe(1400.00); // (15000 - 1000) / 1000 * 100
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ANOMALY_DETECTED' })
    }));
  });

  it('should NOT flag an anomaly if spend is within normal variance', async () => {
    // Current month: 1,200 KES
    jest.spyOn(prisma.feeWaiver, 'aggregate').mockResolvedValueOnce({ _sum: { waiver_amount: 1200 } } as any);
    
    // Historical: 3,000 KES total (Average = 1,000 / month)
    jest.spyOn(prisma.feeWaiver, 'aggregate').mockResolvedValueOnce({ 
      _sum: { waiver_amount: 3000 }, 
      _count: 3 
    } as any);

    const result = await service.detectFinancialAnomalies();

    expect(result.anomaly_detected).toBe(false);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});