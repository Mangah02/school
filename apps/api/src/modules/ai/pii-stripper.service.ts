// apps/api/src/modules/ai/pii-stripper.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PiiStripperService {
  /**
   * REQ-RATE-005: Data minimization - strip PII before sending to external AI APIs.
   * Does NOT apply to Ollama (local), but applied universally for consistency.
   */
  strip(text: string): string {
    return text
      // Kenyan Admission Numbers (SCH/YYYY/####)
      .replace(/\b[A-Z]{2,5}\/\d{4}\/\d{3,5}\b/g, '[ADMISSION_NUMBER]')
      // Kenyan National IDs (6-8 digits)
      .replace(/\b\d{6,8}\b/g, '[NATIONAL_ID]')
      // Phone numbers (Kenyan format)
      .replace(/(\+?254|0)[71]\d{8}/g, '[PHONE_NUMBER]')
      // Email addresses
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      // Full Names (Simple heuristic: 2-3 capitalized words)
      .replace(/\b([A-Z][a-z]+\s){1,2}[A-Z][a-z]+\b/g, '[STUDENT_NAME]');
  }
}