// apps/api/src/modules/ai/__tests__/pii-stripper.service.spec.ts
import { PiiStripperService } from '../pii-stripper.service';

describe('PiiStripperService - REQ-RATE-005', () => {
  let service: PiiStripperService;

  beforeEach(() => {
    service = new PiiStripperService();
  });

  it('should strip Kenyan admission numbers', () => {
    const text = 'Student SCH/2026/0001 needs help.';
    expect(service.strip(text)).toContain('[ADMISSION_NUMBER]');
    expect(service.strip(text)).not.toContain('SCH/2026/0001');
  });

  it('should strip Kenyan phone numbers', () => {
    const text = 'Call me at 0712345678 or +254712345678.';
    const stripped = service.strip(text);
    expect(stripped).toContain('[PHONE_NUMBER]');
    expect(stripped).not.toContain('0712345678');
  });

  it('should strip National IDs', () => {
    const text = 'ID number is 12345678.';
    expect(service.strip(text)).toContain('[NATIONAL_ID]');
  });
});