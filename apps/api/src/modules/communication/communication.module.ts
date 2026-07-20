// apps/api/src/modules/communication/communication.module.ts
import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { QueueModule } from '../../core/queue/queue.module'; // ✅ Import QueueModule

@Module({
  imports: [QueueModule], // ✅ Makes BullQueue_sms-queue and BullQueue_email-queue available
  controllers: [CommunicationController],
  providers: [CommunicationService],
})
export class CommunicationModule {}