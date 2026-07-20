// apps/api/src/modules/communication/providers/whatsapp.provider.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsAppProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly isProduction: boolean;
  private readonly metaApiUrl: string;
  private readonly metaAccessToken: string;
  private readonly phoneNumberId: string;

  constructor(private configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    
    // Risk R-07: Explicitly block unofficial libraries in production
    const useBaileys = this.configService.get<string>('WHATSAPP_USE_BAILEYS') === 'true';
    if (this.isProduction && useBaileys) {
      throw new BadRequestException('CRITICAL: Unofficial WhatsApp (Baileys) is strictly forbidden in production. Use Meta Cloud API.');
    }

    // Provide fallback empty strings to satisfy TypeScript's strict null checks
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    
    this.metaApiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    this.metaAccessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId = phoneNumberId;
  }

  async sendWhatsAppMessage(to: string, message: string): Promise<string> {
    if (this.isProduction) {
      return this.sendViaMetaCloudApi(to, message);
    } else {
      // In dev/test, if Baileys is enabled, route to a local mock or Baileys wrapper
      // For this implementation, we log it as a mock to avoid requiring the heavy baileys dependency in the core API
      this.logger.log(`[DEV/TEST MOCK] WhatsApp message to ${to}: ${message}`);
      return `mock_whatsapp_msg_${Date.now()}`;
    }
  }

  private async sendViaMetaCloudApi(to: string, message: string): Promise<string> {
    try {
      const response = await axios.post(
        this.metaApiUrl,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            Authorization: `Bearer ${this.metaAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.messages[0].id;
    } catch (error: any) {
      this.logger.error(`Meta WhatsApp API failed for ${to}: ${error.message}`);
      throw error; // Triggers BullMQ retry
    }
  }
}