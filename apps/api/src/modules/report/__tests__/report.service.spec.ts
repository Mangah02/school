// apps/api/src/modules/report/__tests__/report.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from '../report.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Queue } from 'bull';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('ReportService - Queue Dispatch (6.2)', () => {
  let service: ReportService;
  let prisma: PrismaService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: {
          student: { findMany: jest.fn().mockResolvedValue([
            { id: 'stu-1', first_name: 'John', last_name: 'Doe', admission_number: 'ADM001', examResults: [] }
          ]) },
        }},
        { provide: 'BullQueue_pdf-generation', useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should dispatch one job per student to the pdf-generation queue', async () => {
    const result = await service.generateClassReportCards('exam-1', 'class-1');

    expect(result.job_count).toBe(1);
    expect(mockQueue.add).toHaveBeenCalledWith(
      'generate-report-card',
      expect.objectContaining({ student_id: 'stu-1', exam_id: 'exam-1' }),
      expect.objectContaining({ attempts: 3 })
    );
  });
});