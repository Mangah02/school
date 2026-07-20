// apps/api/src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiQuotaService } from './ai-quota.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { PiiStripperService } from './providers/pii-stripper.service'; // ✅ Check this path

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AnthropicProvider,
    OllamaProvider,
    PiiStripperService, // ✅ Must be listed here
    AiQuotaService,
  ],
})
export class AiModule {}