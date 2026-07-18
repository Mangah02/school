// apps/api/src/workers/ai-grading.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Processor('ai-grading')
export class AiGradingProcessor {
  private readonly logger = new Logger(AiGradingProcessor.name);
  private aiSpendThisMonth = 0; // In production, fetch from Redis/DB per school

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Process('grade-cbt-session')
  async handleGrading(job: Job) {
    const { session_id, school_id, answers } = job.data;
    let totalScore = 0;

    try {
      for (const ans of answers) {
        let score = 0;

        if (ans.question_type === 'MCQ' || ans.question_type === 'SHORT_ANSWER') {
          // Deterministic auto-grading
          if (ans.student_answer.trim().toLowerCase() === ans.correct_answer.trim().toLowerCase()) {
            score = ans.marks;
          }
        } 
        else if (ans.question_type === 'ESSAY' && ans.rubric) {
          // REQ-RATE-005: Strip PII before sending to AI
          const sanitizedPrompt = this.stripPII(ans.student_answer);
          
          // REQ-RATE-001/002: Check cost cap
          if (this.aiSpendThisMonth >= 5000) { // KES 5000 default cap
            this.logger.warn('AI cap reached. Degrading to heuristic scoring.');
            score = this.heuristicFallbackScore(sanitizedPrompt, ans.marks);
          } else {
            // Mock AI API Call (Replace with actual Anthropic/OpenAI/Ollama call)
            const aiResponse = await this.mockAIGradingCall(ans.rubric, sanitizedPrompt, ans.marks);
            score = aiResponse.score;
            
            // REQ-RATE-004: Log token usage and cost
            this.aiSpendThisMonth += aiResponse.estimated_cost;
            await this.prisma.auditLog.create({
              data: {
                school_id,
                action: 'AI_GRADE',
                entity_type: 'CBTAnswer',
                entity_id: ans.question_id,
                new_values: { tokens: aiResponse.tokens, cost: aiResponse.estimated_cost }
              }
            });
          }
        }

        totalScore += score;
        
        // Save graded result (In production, this would go to an ExamResult or CBTResult table)
        // For now, we just log it or update a hypothetical score field
      }

      this.logger.log(`Session ${session_id} graded. Total Score: ${totalScore}`);
      return { success: true, totalScore };

    } catch (error) {
      this.logger.error(`Failed to grade session ${session_id}: ${error.message}`);
      throw error; // Bull will retry
    }
  }

  /**
   * REQ-RATE-005: Data minimization - strip names, admission numbers, etc.
   */
  private stripPII(text: string): string {
    return text
      .replace(/\b\d{4}\/\d{4}\/\d{4}\b/g, '[ADMISSION_NUMBER]') // SCH/YYYY/####
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[STUDENT_NAME]') // Simple name regex
      .replace(/\b\d{10,12}\b/g, '[ID_NUMBER]');
  }

  /**
   * REQ-RATE-003: Graceful degradation when AI cap is hit.
   */
  private heuristicFallbackScore(text: string, maxMarks: number): number {
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 150) return maxMarks * 0.8;
    if (wordCount > 50) return maxMarks * 0.5;
    return maxMarks * 0.2;
  }

  private async mockAIGradingCall(rubric: string, essay: string, maxMarks: number) {
    // Simulate AI latency and response
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      score: maxMarks * 0.75, // Mock score
      tokens: 150,
      estimated_cost: 0.05 // Mock cost in KES
    };
    // In production: return axios.post('https://api.anthropic.com/...', { prompt: `Grade this essay based on rubric: ${rubric}\n\nEssay: ${essay}` })
  }
}