// apps/api/src/modules/ai/interfaces/ai-provider.interface.ts
export interface AiPromptOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiResponse {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number; // in KES
  model: string;
  provider: string;
}

export interface AiProvider {
  readonly name: string;
  generateText(prompt: string, options?: AiPromptOptions): Promise<AiResponse>;
}