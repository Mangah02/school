// apps/api/src/modules/ai/ai.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AiProvider, AiPromptOptions, AiResponse } from './interfaces/ai-provider.interface';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { PiiStripperService } from './providers/pii-stripper.service'; // ✅ FIXED PATH
import { AiQuotaService } from './ai-quota.service'; // <-- Added for Milestone 8.6
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly providers: Map<string, AiProvider> = new Map();
  private readonly defaultProvider: string;

  constructor(
    private prisma: PrismaService,
    private anthropicProvider: AnthropicProvider,
    private ollamaProvider: OllamaProvider,
    private piiStripper: PiiStripperService,
    private aiQuotaService: AiQuotaService, // <-- Injected for Milestone 8.6
  ) {
    this.providers.set('ANTHROPIC', this.anthropicProvider);
    this.providers.set('OLLAMA', this.ollamaProvider);
    
    // Default to Anthropic, fallback to Ollama
    this.defaultProvider = process.env.AI_DEFAULT_PROVIDER || 'ANTHROPIC';
  }

  /**
   * Main entry point for all AI generation.
   * Handles PII stripping, quota enforcement, provider routing, and usage logging.
   */
  async generate(
    feature: string, 
    rawPrompt: string, 
    options?: AiPromptOptions & { provider?: string, userId?: string }
  ): Promise<AiResponse> {
    const context = tenantStorage.getStore();
    if (!context?.schoolId) throw new BadRequestException('Tenant context missing');

    // 1. Strip PII (REQ-RATE-005 / Milestone 8.7)
    const sanitizedPrompt = this.piiStripper.stripPII(rawPrompt);

    // 2. ESTIMATED COST CHECK (Mock estimation before calling API)
    // In production, use tiktoken to count tokens and multiply by model pricing
    const estimatedCost = 0.10; // Mock KES 0.10 per request
    
    // 3. ENFORCE QUOTA (Milestone 8.6)
    const quotaResult = await this.aiQuotaService.checkAndEnforceQuota(context.schoolId, estimatedCost);
    
    // Override provider if quota exceeded (Graceful Degradation)
    const providerName = quotaResult.allowedProvider !== 'ANTHROPIC' 
      ? 'OLLAMA' 
      : (options?.provider || this.defaultProvider);

    const activeProvider = this.providers.get(providerName) || this.ollamaProvider;

    try {
      // 4. Generate Text
      const response = await activeProvider.generateText(sanitizedPrompt, options);

      // 5. Log usage (The cost logged here will be the actual cost, which might be 0 if degraded to Ollama)
      await this.prisma.aiUsageLog.create({
        data: {
          school_id: context.schoolId,
          provider: response.provider,
          model: response.model,
          feature: feature,
          prompt_tokens: response.promptTokens,
          completion_tokens: response.completionTokens,
          total_tokens: response.totalTokens,
          estimated_cost: response.estimatedCost,
          user_id: options?.userId,
        }
      });

      return response;

    } catch (error) {
      this.logger.error(`AI generation failed for feature ${feature}: ${error.message}`);
      
      // REQ-RATE-003: Graceful degradation fallback
      if (activeProvider.name !== 'OLLAMA') {
        this.logger.log('Falling back to local Ollama instance...');
        return this.ollamaProvider.generateText(sanitizedPrompt, options);
      }
      
      throw error;
    }
  }
}