// apps/api/src/modules/transport/transport.module.ts
import { Module } from '@nestjs/common';
import { TransportController } from './transport.controller';
import { TransportService } from './transport.service';
import { QueueModule } from '../../core/queue/queue.module';  // adjust path to wherever QueueModule actually lives

@Module({
  imports: [QueueModule],
  controllers: [TransportController],
  providers: [TransportService],
})
export class TransportModule {}