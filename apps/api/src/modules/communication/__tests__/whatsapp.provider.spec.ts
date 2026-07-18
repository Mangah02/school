// apps/api/src/modules/communication/__tests__/whatsapp.provider.spec.ts
import { WhatsAppProvider } from '../providers/whatsapp.provider';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

describe('WhatsAppProvider - Risk R-07 Gating', () => {
  it('should throw BadRequestException if Baileys is enabled in production', () => {
    const mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WHATSAPP_USE_BAILEYS') return 'true';
        return 'mock_value';
      })
    };

    expect(() => new WhatsAppProvider(mockConfig as any)).toThrow(BadRequestException);
  });

  it('should initialize successfully in production when using Meta Cloud API', () => {
    const mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WHATSAPP_USE_BAILEYS') return 'false';
        return 'mock_value';
      })
    };

    expect(() => new WhatsAppProvider(mockConfig as any)).not.toThrow();
  });
});