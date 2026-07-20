// apps/api/src/modules/communication/providers/sms.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly apiKey: string;
  private readonly senderName: string;

  constructor(private configService: ConfigService) {
    // Provide fallback empty string to satisfy TypeScript's strict null checks
    this.apiKey = this.configService.get<string>('AT_API_KEY') || '';
    this.senderName = this.configService.get<string>('AT_SENDER_NAME') || 'SMIS';
  }

  async sendSms(to: string, message: string): Promise<string> {
    try {
      // Africa's Talking API endpoint
      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        {
          to: to, // Comma-separated for bulk, but we send 1:1 for better tracking
          message: message,
          from: this.senderName,
        },
        {
          headers: {
            apiKey: this.apiKey,
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // AT returns an array of SMSMessageResult
      const result = response.data.SMSMessageData.Recipients[0];
      if (result.status === 'Success') {
        return result.messageId;
      } else {
        throw new Error(`AT API Error: ${result.status}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to send SMS to ${to}: ${error.message}`);
      throw error; // Throw to trigger BullMQ retry
    }
  }
}