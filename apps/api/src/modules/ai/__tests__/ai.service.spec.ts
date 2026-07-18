// apps/api/src/modules/ai/__tests__/ai.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../ai.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { OllamaProvider } from '../providers/ollama.provider';
import { PiiStripperService } from '../pii-stripper.service';
import { tenantStorage } from '../../../core/tenant/tenant.context';

describe('AiService - Provider Routing & Fallback', () => {
  let service: AiService;
  let prisma: PrismaService;
  let anthropic: AnthropicProvider;
  let ollama: OllamaProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: { aiUsageLog: { create: jest.fn() } } },
        { provide: AnthropicProvider, useValue: { 
          name: 'ANTHROPIC', 
          generateText: jest.fn().mockResolvedValue({ text: 'AI response', provider: 'ANTHROPIC', model: 'claude-3', promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.05 }) 
        }},
        { provide: OllamaProvider, useValue: { 
          name: 'OLLAMA', 
          generateText: jest.fn().mockResolvedValue({ text: 'Local response', provider: 'OLLAMA', model: 'llama3', promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0 }) 
        }},
        PiiStripperService,
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);
    anthropic = module.get<AnthropicProvider>(AnthropicProvider);
    ollama = module.get<OllamaProvider>(OllamaProvider);
    
    tenantStorage.enterWith({ schoolId: 'sch-1', userId: 'user-1' });
  });

  it('should strip PII before sending to the provider', async () => {
    await service.generate('CHATBOT', 'My name is John Doe, call 0712345678');

    expect(anthropic.generateText).toHaveBeenCalledWith(
      expect.stringContaining('[STUDENT_NAME]'),
      undefined
    );
    expect(anthropic.generateText).toHaveBeenCalledWith(
      expect.stringContaining('[PHONE_NUMBER]'),
      undefined
    );
  });

  it('should fallback to Ollama if Anthropic fails', async () => {
    jest.spyOn(anthropic, 'generateText').mockRejectedValue(new Error('API Down'));

    const result = await service.generate('CHATBOT', 'Test prompt');

    expect(result.provider).toBe('OLLAMA');
    expect(ollama.generateText).toHaveBeenCalled();
  });

  it('should log usage and cost to the database', async () => {
    await service.generate('CBT_GRADING', 'Grade this essay');

    expect(prisma.aiUsageLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        provider: 'ANTHROPIC',
        feature: 'CBT_GRADING',
        estimated_cost: 0.05,
      })
    }));
  });
});