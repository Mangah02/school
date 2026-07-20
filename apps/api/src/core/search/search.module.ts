
// apps/api/src/core/search/search.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // ✅ Import ConfigModule
import { SearchService } from './search.service';
import { MeilisearchService } from './meilisearch.service';

@Module({
  imports: [ConfigModule], // ✅ Make ConfigService available to MeilisearchService
  providers: [
    SearchService,
    MeilisearchService, 
  ],
  exports: [SearchService], 
})
export class SearchModule {}