// apps/api/src/core/search/search.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Global Search')
@Controller('search')
@UseGuards(JwtAuthGuard, TenantGuard) // Requires auth and tenant context
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query('q') q: string) {
    if (!q || q.length < 2) {
      return { students: [], staff: [], books: [], total_results: 0 };
    }
    return this.searchService.globalSearch(q);
  }
}