// apps/api/src/modules/transport/__tests__/transport.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TransportService } from '../transport.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('TransportService - Delay Notifications (9.2)', () => {
  let service: TransportService;
  let prisma: PrismaService;
  let mockSmsQueue: any;

  beforeEach(async () => {
    mockSmsQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportService,
        { provide: PrismaService, useValue: {
          transportRoute: { findFirst: jest.fn() },
          busAssignment: { create: jest.fn() },
        }},
        { provide: 'BullQueue_sms-queue', useValue: mockSmsQueue },
      ],
    }).compile();

    service = module.get<TransportService>(TransportService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should queue SMS notifications to primary guardians when delay is recorded', async () => {
    const mockRoute = {
      id: 'r1', name: 'Route A',
      assignments: [
        { 
          student: { first_name: 'John', guardians: [{ guardian: { id: 'g1', is_primary: true, phone: '254712345678' } }] } 
        }
      ]
    };
    jest.spyOn(prisma.transportRoute, 'findFirst').mockResolvedValue(mockRoute as any);

    const result = await service.recordBusDelay('r1', 30, 'Traffic');

    expect(result.notifications_sent).toBe(1);
    expect(mockSmsQueue.add).toHaveBeenCalledWith('send-sms', expect.objectContaining({
      recipient_contact: '254712345678',
      message: expect.stringContaining('delayed by approx. 30 mins')
    }));
  });
});