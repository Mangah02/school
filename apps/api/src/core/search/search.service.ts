// apps/api/src/core/search/search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MeilisearchService } from './meilisearch.service';
import { PrismaService } from '../prisma/prisma.service';
import { tenantStorage } from '../tenant/tenant.context';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private meilisearch: MeilisearchService,
    private prisma: PrismaService,
  ) {}

  async globalSearch(query: string) {
    const context = tenantStorage.getStore();
    if (!context?.schoolId) throw new Error('Tenant context missing');
    if (!query || query.length < 2) return { students: [], staff: [], books: [], total_results: 0 };

    try {
      // Attempt MeiliSearch first
      const filter = `school_id = '${context.schoolId}'`;
      const [students, staff, books] = await Promise.all([
        this.meilisearch['studentIndex'].search(query, { filter, limit: 10 }),
        this.meilisearch['staffIndex'].search(query, { filter, limit: 10 }),
        this.meilisearch['bookIndex'].search(query, { filter, limit: 10 }),
      ]);

      return {
        students: students.hits,
        staff: staff.hits,
        books: books.hits,
        total_results: students.estimatedTotalHits + staff.estimatedTotalHits + books.estimatedTotalHits,
        source: 'MEILISEARCH'
      };
    } catch (error) {
      this.logger.warn(`MeiliSearch failed, falling back to PostgreSQL FTS: ${error.message}`);
      return this.postgresFallbackSearch(context.schoolId, query);
    }
  }

  private async postgresFallbackSearch(schoolId: string, query: string) {
    // PostgreSQL ILIKE fallback (or raw to_tsvector for true FTS)
    const searchCondition = {
      OR: [
        { first_name: { contains: query, mode: 'insensitive' } },
        { last_name: { contains: query, mode: 'insensitive' } },
        { admission_number: { contains: query, mode: 'insensitive' } },
        { employee_id: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
      ]
    };

    const [students, staff, books] = await Promise.all([
      this.prisma.student.findMany({ 
        where: { school_id: schoolId, is_deleted: false, ...searchCondition }, 
        select: { id: true, first_name: true, last_name: true, admission_number: true },
        take: 10 
      }),
      this.prisma.staff.findMany({ 
        where: { school_id: schoolId, is_deleted: false, ...searchCondition }, 
        select: { id: true, first_name: true, last_name: true, employee_id: true },
        take: 10 
      }),
      this.prisma.book.findMany({ 
        where: { school_id: schoolId, is_deleted: false, ...searchCondition }, 
        select: { id: true, title: true, author: true, isbn: true },
        take: 10 
      }),
    ]);

    return {
      students,
      staff,
      books,
      total_results: students.length + staff.length + books.length,
      source: 'POSTGRES_FALLBACK'
    };
  }
}