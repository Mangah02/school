// apps/api/src/modules/cbt/cbt.module.ts
import { Module } from '@nestjs/common';
import { CbtController } from './cbt.controller';
import { CbtService } from './cbt.service';
import { QueueModule } from '../../core/queue/queue.module'; // ✅ Import QueueModule

@Module({
  imports: [QueueModule], // ✅ Add it here
  controllers: [CbtController],
  providers: [CbtService],
})
export class CbtModule {}