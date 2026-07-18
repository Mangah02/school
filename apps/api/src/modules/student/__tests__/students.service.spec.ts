// apps/api/src/modules/student/__tests__/students.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from '../students.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Queue } from 'bull';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: PrismaService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = { add: jest.fn() };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: {
          student: { count: jest.fn().mockResolvedValue(5), create: jest.fn().mockResolvedValue({ id: 'stu-1' }) },
          school: { findUnique: jest.fn().mockResolvedValue({ id: 'sch-1', kms_code: 'KMS' }) },
          academicYear: { findFirst: jest.fn().mockResolvedValue({ id: 'year-1' }) },
          enrollment: { create: jest.fn() },
          guardian: { create: jest.fn().mockResolvedValue({ id: 'g-1' }) },
          guardianStudent: { create: jest.fn() },
          $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)), // Mock transaction
        }},
        { provide: 'BullQueue_notifications', useValue: mockQueue }, // Mock Bull Queue
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    prisma = module.get<PrismaService>(PrismaService);
    
    // Set tenant context for tests
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should generate correct admission number and create student with guardians', async () => {
    const dto = {
      personal: { first_name: 'John', last_name: 'Doe', date_of_birth: '2010-01-01', gender: 'M', nationality: 'Kenyan' },
      academic: { class_id: 'class-1', curriculum_type: 'CBC' },
      guardians: [{ first_name: 'Jane', last_name: 'Doe', phone: '0712345678', relationship: 'MOTHER', is_primary: true }],
    };

    const result = await service.admitStudent(dto as any);

    expect(result.id).toBe('stu-1');
    expect(prisma.student.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        admission_number: 'KMS/' + new Date().getFullYear() + '/0006', // Count was 5, so 6
        first_name: 'John',
      }),
    }));
    expect(prisma.guardian.create).toHaveBeenCalledTimes(1);
    expect(prisma.guardianStudent.create).toHaveBeenCalledTimes(1);
    expect(mockQueue.add).toHaveBeenCalledWith('send-sms', expect.objectContaining({ to: '0712345678' }));
  });
});