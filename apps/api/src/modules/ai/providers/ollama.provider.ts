// apps/api/src/modules/ai/providers/ollama.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiPromptOptions, AiResponse } from '../interfaces/ai-provider.interface';
import axios from 'axios';

@Injectable()
export class OllamaProvider implements AiProvider {
  readonly name = 'OLLAMA';
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
  }

  async generateText(prompt: string, options?: AiPromptOptions): Promise<AiResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: options?.model || 'llama3',
        prompt: prompt,
        stream: false,
        options: {
          temperature: options?.temperature || 0.7,
          num_predict: options?.maxTokens || 512,
        }
      });

      // Ollama returns prompt_eval_count and eval_count
      const promptTokens = response.data.prompt_eval_count || 0;
      const completionTokens = response.data.eval_count || 0;

      return {
        text: response.data.response,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCost: 0, // Local execution is free (hardware cost excluded)
        model: response.data.model,
        provider: this.name,
      };
    } catch (error) {
      this.logger.error(`Ollama API error: ${error.message}`);
      throw error;
    }
  }
}