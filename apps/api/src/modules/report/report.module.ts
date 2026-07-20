// apps/api/src/modules/report/report.module.ts
import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { QueueModule } from '../../core/queue/queue.module'; // ✅ Import QueueModule

@Module({
  imports: [QueueModule], // ✅ Makes BullQueue_pdf-generation available
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}