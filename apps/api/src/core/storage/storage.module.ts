// apps/api/src/core/storage/storage.module.ts
import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';

@Global() // ✅ Makes StorageService available everywhere
@Module({
  providers: [StorageService],
  exports: [StorageService], // ✅ Crucial: Exposes the service
})
export class StorageModule {}