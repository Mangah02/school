// apps/api/src/modules/ai/providers/pii-stripper.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PiiStripperService { // ✅ Must be exactly this name
  stripPII(text: string): string {
    if (!text) return '';
    return text
      .replace(/\b[A-Z0-9]+\/\d{4}\/\d{3,4}\b/gi, '[ADMISSION_NUMBER]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/(?:\+254|0)[17]\d{8}/g, '[PHONE_NUMBER]')
      .replace(/\b\d{6,8}\b/g, '[ID_NUMBER]')
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[STUDENT_NAME]');
  }
}