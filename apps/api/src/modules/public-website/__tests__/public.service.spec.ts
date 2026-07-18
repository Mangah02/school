// apps/api/src/modules/public/__tests__/public.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from '../public.service';
import { PrismaService } from '../../../core/prisma/prisma.service';

describe('PublicService - CMS (10.3)', () => {
  let service: PublicService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: {
          publicAnnouncement: { findMany: jest.fn() },
          contactFormSubmission: { create: jest.fn(), update: jest.fn() },
        }},
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should only fetch active announcements published in the past', async () => {
    jest.spyOn(prisma.publicAnnouncement, 'findMany').mockResolvedValue([]);
    
    await service.getActiveAnnouncements('sch-1');

    expect(prisma.publicAnnouncement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        is_active: true,
        publish_date: expect.any(Object), // lte: new Date()
      })
    }));
  });

  it('should create a new contact form submission', async () => {
    jest.spyOn(prisma.contactFormSubmission, 'create').mockResolvedValue({ id: 'sub-1' } as any);

    const data = { name: 'Parent', email: 'p@a.com', subject: 'Inquiry', message: 'Hello' };
    const result = await service.submitContactForm('sch-1', data as any);

    expect(result.id).toBe('sub-1');
    expect(prisma.contactFormSubmission.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'NEW' })
    }));
  });
});