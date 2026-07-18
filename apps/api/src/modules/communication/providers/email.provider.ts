// apps/api/src/modules/communication/providers/email.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<number>('SMTP_PORT') === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<string> {
    try {
      const info = await this.transporter.sendMail({
        from: `"School Management" <${this.configService.get<string>('SMTP_FROM')}>`,
        to,
        subject,
        html,
      });
      return info.messageId;
    } catch (error) {
      this.logger.error(`Failed to send Email to ${to}: ${error.message}`);
      throw error;
    }
  }
}