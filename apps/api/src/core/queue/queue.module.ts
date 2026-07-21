// apps/api/src/core/queue/queue.module.ts
import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

@Global() // ✅ Makes all queues available everywhere
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'ai-grading' },
      { name: 'pdf-generation' },
      { name: 'sms-queue' },
      { name: 'whatsapp-queue' },
      { name: 'email-queue' },
      { name: 'mpesa-stk' },
    ),
  ],
  exports: [BullModule], // ✅ Crucial: Exposes the queues
})
export class QueueModule {}