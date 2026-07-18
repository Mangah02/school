// apps/api/src/core/search/__tests__/search.fallback.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../search.service';
import { MeilisearchService } from '../meilisearch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { tenantStorage } from '../../tenant/tenant.context';

describe('SearchService - Postgres Fallback (10.4)', () => {
  let service: SearchService;
  let meilisearch: MeilisearchService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: MeilisearchService, useValue: {
          studentIndex: { search: jest.fn().mockRejectedValue(new Error('MeiliSearch Down')) },
          staffIndex: { search: jest.fn().mockRejectedValue(new Error('MeiliSearch Down')) },
          bookIndex: { search: jest.fn().mockRejectedValue(new Error('MeiliSearch Down')) },
        }},
        { provide: PrismaService, useValue: {
          student: { findMany: jest.fn().mockResolvedValue([{ id: 's1', first_name: 'John' }]) },
          staff: { findMany: jest.fn().mockResolvedValue([]) },
          book: { findMany: jest.fn().mockResolvedValue([]) },
        }},
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    meilisearch = module.get<MeilisearchService>(MeilisearchService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should fallback to PostgreSQL ILIKE search when MeiliSearch throws an error', async () => {
    const result = await service.globalSearch('John');

    expect(result.source).toBe('POSTGRES_FALLBACK');
    expect(result.students.length).toBe(1);
    expect(prisma.student.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        school_id: 'sch-1',
        OR: expect.any(Array)
      })
    }));
  });
});