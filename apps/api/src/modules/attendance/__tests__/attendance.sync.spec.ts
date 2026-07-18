// apps/api/src/modules/attendance/__tests__/attendance.sync.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from '../attendance.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('AttendanceService - Offline Sync (REQ-SYNC-003)', () => {
  let service: AttendanceService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: {
          attendanceRecord: { 
            findUnique: jest.fn(), 
            create: jest.fn(), 
            update: jest.fn() 
          },
        }},
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should accept client data if client_updated_at is newer than server_updated_at', async () => {
    const clientTime = new Date(Date.now() + 10000); // 10s in future
    const serverTime = new Date(Date.now() - 10000); // 10s in past

    jest.spyOn(prisma.attendanceRecord, 'findUnique').mockResolvedValue({ 
      id: 'att-1', server_updated_at: serverTime 
    } as any);

    const payload = [{ student_id: 'stu-1', date: '2026-07-20', status: 'PRESENT', client_updated_at: clientTime.toISOString() }];
    const result = await service.syncOfflineAttendance(payload, 'user-1');

    expect(result.accepted).toContain('stu-1');
    expect(prisma.attendanceRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ is_conflict: false })
    }));
  });

  it('should flag as conflict if server_updated_at is newer', async () => {
    const clientTime = new Date(Date.now() - 20000); // Older
    const serverTime = new Date(Date.now() - 10000); // Newer

    jest.spyOn(prisma.attendanceRecord, 'findUnique').mockResolvedValue({ 
      id: 'att-1', server_updated_at: serverTime 
    } as any);

    const payload = [{ student_id: 'stu-1', date: '2026-07-20', status: 'ABSENT', client_updated_at: clientTime.toISOString() }];
    const result = await service.syncOfflineAttendance(payload, 'user-1');

    expect(result.conflicts.length).toBe(1);
    expect(prisma.attendanceRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ is_conflict: true })
    }));
  });
});