// apps/api/src/workers/__tests__/ai-grading.processor.spec.ts
import { AiGradingProcessor } from '../ai-grading.processor';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AiGradingProcessor - PII Stripping & Cost Governance (6.5)', () => {
  let processor: AiGradingProcessor;
  let prisma: PrismaService;

  beforeEach(async () => {
    prisma = { auditLog: { create: jest.fn() } } as any;
    processor = new AiGradingProcessor(prisma, { get: jest.fn() } as any);
  });

  it('should strip PII (Admission No, Names, ID) before AI processing', () => {
    const rawEssay = "My name is John Doe, admission number SCH/2026/0001, ID 12345678. I think photosynthesis is...";
    const sanitized = processor['stripPII'](rawEssay);

    expect(sanitized).toContain('[STUDENT_NAME]');
    expect(sanitized).toContain('[ADMISSION_NUMBER]');
    expect(sanitized).toContain('[ID_NUMBER]');
    expect(sanitized).not.toContain('John Doe');
    expect(sanitized).not.toContain('SCH/2026/0001');
  });

  it('should use heuristic fallback when AI monthly cap is reached', () => {
    processor['aiSpendThisMonth'] = 6000; // Over 5000 KES cap
    const score = processor['heuristicFallbackScore']("A very long and detailed essay about biology...", 10);
    
    expect(score).toBe(8); // 80% of max marks for >150 words
  });
});