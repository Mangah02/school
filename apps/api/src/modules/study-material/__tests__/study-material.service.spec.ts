// apps/api/src/modules/study-material/__tests__/study-material.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { StudyMaterialService } from '../study-material.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { StorageService } from '../../../core/storage/storage.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('StudyMaterialService - Versioning & Tracking (6.6)', () => {
  let service: StudyMaterialService;
  let prisma: PrismaService;
  let storage: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyMaterialService,
        { provide: PrismaService, useValue: {
          studyMaterial: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
          studyMaterialDownload: { create: jest.fn(), count: jest.fn() },
        }},
        { provide: StorageService, useValue: { uploadBuffer: jest.fn().mockResolvedValue('https://minio/mock-url.pdf') } },
        { provide: 'BullQueue_notifications', useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<StudyMaterialService>(StudyMaterialService);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<StorageService>(StorageService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should archive old version and increment version number on re-upload', async () => {
    jest.spyOn(prisma.studyMaterial, 'findFirst').mockResolvedValue({ id: 'mat-1', title: 'Math Notes', version: 1 } as any);
    jest.spyOn(prisma.studyMaterial, 'create').mockResolvedValue({ id: 'mat-2', version: 2 } as any);

    const dto = { title: 'Math Notes', file_type: 'PDF', visibility: 'CLASS' } as any;
    await service.uploadAndPublish(dto, Buffer.from('test'), 'math.pdf', 'user-1');

    expect(prisma.studyMaterial.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'mat-1' },
      data: { is_archived: true }
    }));
    expect(prisma.studyMaterial.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ version: 2 })
    }));
  });

  it('should track downloads successfully', async () => {
    jest.spyOn(prisma.studyMaterial, 'findFirst').mockResolvedValue({ id: 'mat-1' } as any);
    jest.spyOn(prisma.studyMaterialDownload, 'create').mockResolvedValue({ id: 'dl-1' } as any);

    const result = await service.trackDownload('mat-1', 'stu-1');
    expect(result.id).toBe('dl-1');
  });
});