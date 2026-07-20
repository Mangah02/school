// apps/api/src/modules/study-material/study-material.module.ts
import { Module } from '@nestjs/common';
import { StudyMaterialController } from './study-material.controller';
import { StudyMaterialService } from './study-material.service';
import { StorageModule } from '../../core/storage/storage.module'; // ✅ Import StorageModule
import { QueueModule } from '../../core/queue/queue.module';       // ✅ Import QueueModule

@Module({
  imports: [
    StorageModule, // ✅ Makes StorageService available
    QueueModule,   // ✅ Makes BullQueue_notifications available
  ],
  controllers: [StudyMaterialController],
  providers: [StudyMaterialService],
})
export class StudyMaterialModule {}