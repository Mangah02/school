// apps/api/src/core/search/__tests__/search.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '../search.service';
import { MeilisearchService } from '../meilisearch.service';
import { tenantStorage } from '../../tenant/tenant.context';

describe('SearchService - Tenant Isolation (10.2)', () => {
  let service: SearchService;
  let meilisearch: MeilisearchService;

  beforeEach(async () => {
    const mockIndex = {
      search: jest.fn().mockResolvedValue({ hits: [], estimatedTotalHits: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: MeilisearchService, useValue: {
          studentIndex: mockIndex,
          staffIndex: mockIndex,
          bookIndex: mockIndex,
        }},
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    meilisearch = module.get<MeilisearchService>(MeilisearchService);
    
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should enforce school_id filter in MeiliSearch queries', async () => {
    await service.globalSearch('John');

    expect(meilisearch['studentIndex'].search).toHaveBeenCalledWith('John', {
      filter: "school_id = 'sch-1'",
      limit: 10,
    });
  });
});