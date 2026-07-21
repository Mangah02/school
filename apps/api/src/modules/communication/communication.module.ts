// apps/api/src/modules/communication/communication.module.ts
import { Module, Global } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';

@Global() // ✅ Makes CommunicationService available to AiModule, FinanceModule, etc.
@Module({
  controllers: [CommunicationController],
  providers: [CommunicationService],
  exports: [CommunicationService], // ✅ Crucial: Exposes the service globally
})
export class CommunicationModule {}