// apps/api/src/modules/ai/providers/anthropic.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiPromptOptions, AiResponse } from '../interfaces/ai-provider.interface';
import axios from 'axios';

@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly name = 'ANTHROPIC';
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
  }

  async generateText(prompt: string, options?: AiPromptOptions): Promise<AiResponse> {
    if (!this.apiKey) throw new Error('Anthropic API key not configured');

    try {
      // Mocking the actual API call structure for Anthropic Claude
      // In production, use the @anthropic-ai/sdk package
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: options?.model || 'claude-3-sonnet-20240229',
        max_tokens: options?.maxTokens || 1024,
        messages: [{ role: 'user', content: prompt }],
      }, {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        }
      });

      const promptTokens = response.data.usage.input_tokens;
      const completionTokens = response.data.usage.output_tokens;

      // Rough cost calculation (Claude 3 Sonnet: $3/M input, $15/M output)
      const costUsd = (promptTokens * 3 / 1000000) + (completionTokens * 15 / 1000000);
      const costKes = costUsd * 130; // Approximate KES conversion

      return {
        text: response.data.content[0].text,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCost: costKes,
        model: response.data.model,
        provider: this.name,
      };
    } catch (error) {
      this.logger.error(`Anthropic API error: ${error.message}`);
      throw error;
    }
  }
}