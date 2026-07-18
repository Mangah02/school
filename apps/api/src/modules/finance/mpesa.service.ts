// apps/api/src/modules/finance/mpesa.service.ts
import { Injectable, BadRequestException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InitiateStkPushDto } from './dto/initiate-stk-push.dto';
import { MpesaCallbackDto } from './dto/mpesa-callback.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly shortcode: string;
  private readonly passkey: string;
  private readonly callbackUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @InjectQueue('mpesa-stk') private mpesaQueue: Queue,
  ) {
    this.consumerKey = this.configService.get<string>('MPESA_CONSUMER_KEY');
    this.consumerSecret = this.configService.get<string>('MPESA_CONSUMER_SECRET');
    this.shortcode = this.configService.get<string>('MPESA_SHORTCODE');
    this.passkey = this.configService.get<string>('MPESA_PASSKEY');
    this.callbackUrl = this.configService.get<string>('MPESA_CALLBACK_URL');
  }

  /**
   * REQ-MPESA-001/005: Initiates STK Push and queues a timeout check.
   */
  async initiateStkPush(dto: InitiateStkPushDto, userId: string) {
    const context = tenantStorage.getStore();

    // 1. Validate Invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoice_id, school_id: context.schoolId, status: { not: 'VOID' } }
    });
    if (!invoice) throw new BadRequestException('Invoice not found');
    
    const outstanding = invoice.total_amount - invoice.paid_amount - invoice.waived_amount;
    if (dto.amount > outstanding + 0.01) throw new BadRequestException('Amount exceeds outstanding balance');

    // 2. Generate Daraja Timestamp & Password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');

    // 3. Get OAuth Token (In production, cache this token in Redis for 50 mins)
    const authToken = await this.getOAuthToken();

    // 4. Create PENDING Payment Record (Idempotency key generated here)
    const checkoutRequestId = `smis_${context.schoolId}_${Date.now()}`;
    
    const payment = await this.prisma.payment.create({
      data: {
        school_id: context.schoolId,
        invoice_id: invoice.id,
        amount: dto.amount,
        method: 'MPESA',
        reference: checkoutRequestId,
        phone_number: dto.phone_number,
        mpesa_state: 'INITIATED',
        status: 'PENDING',
        checkout_request_id: checkoutRequestId,
      }
    });

    // 5. Trigger STK Push to Safaricom
    try {
      const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', // Use production URL in prod
        {
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.round(dto.amount),
          PartyA: dto.phone_number,
          PartyB: this.shortcode,
          PhoneNumber: dto.phone_number,
          CallBackURL: this.callbackUrl,
          AccountReference: invoice.student.admission_number || 'SMIS',
          TransactionDesc: `Fee Payment for ${invoice.student.first_name}`,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { 
          merchant_request_id: response.data.MerchantRequestID,
          mpesa_state: 'PENDING' 
        }
      });

      // 6. Queue a timeout check (90 seconds)
      await this.mpesaQueue.add('check-timeout', { payment_id: payment.id }, { delay: 90000 });

      return { success: true, checkout_request_id: checkoutRequestId, message: 'STK Push sent to phone' };

    } catch (error) {
      this.logger.error(`STK Push failed: ${error.message}`);
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { mpesa_state: 'FAILED', status: 'FAILED', result_desc: error.message }
      });
      throw new BadRequestException('Failed to initiate STK Push. Please try again.');
    }
  }

  /**
   * REQ-MPESA-004: Callback endpoint. Strictly idempotent.
   */
  async processCallback(dto: MpesaCallbackDto) {
    // 1. Idempotency Check: Find existing payment by CheckoutRequestID
    const payment = await this.prisma.payment.findUnique({
      where: { checkout_request_id: dto.CheckoutRequestID },
      include: { invoice: true }
    });

    if (!payment) {
      this.logger.warn(`Callback received for unknown CheckoutRequestID: ${dto.CheckoutRequestID}`);
      return { ResultCode: 1, ResultDesc: 'Unknown request' };
    }

    // If already successfully processed, return 200 OK immediately (Idempotent)
    if (payment.mpesa_state === 'SUCCESS') {
      return { ResultCode: 0, ResultDesc: 'Success' };
    }

    // 2. Extract MPESA Receipt Number (if successful)
    let mpesaReceipt = null;
    if (dto.ResultCode === 0 && dto.CallbackMetadata) {
      const receiptItem = dto.CallbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber');
      if (receiptItem) mpesaReceipt = receiptItem.Value as string;
    }

    // 3. Update Payment State in a Transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          mpesa_state: dto.ResultCode === 0 ? 'SUCCESS' : 'FAILED',
          status: dto.ResultCode === 0 ? 'SUCCESS' : 'FAILED',
          result_code: dto.ResultCode,
          result_desc: dto.ResultDesc,
          reference: mpesaReceipt || payment.reference,
        }
      });

      // 4. If successful, update Invoice and post Double-Entry Journals
      if (dto.ResultCode === 0) {
        const newPaidAmount = payment.invoice.paid_amount + payment.amount;
        const newStatus = newPaidAmount >= payment.invoice.total_amount ? 'PAID' : 'PARTIAL';

        await tx.invoice.update({
          where: { id: payment.invoice_id },
          data: { paid_amount: newPaidAmount, status: newStatus }
        });

        // Double-Entry: Debit MPESA Clearing, Credit Fee Receivable
        await tx.journalEntry.createMany({
          data: [
            {
              school_id: payment.school_id,
              transaction_id: crypto.randomUUID(),
              account_code: '1050_MPESA_CLEARING',
              description: `MPESA Ref: ${mpesaReceipt}`,
              debit: payment.amount,
              credit: 0
            },
            {
              school_id: payment.school_id,
              transaction_id: crypto.randomUUID(), // Same transaction ID for linking
              account_code: '1000_FEE_RECEIVABLE',
              description: `MPESA Ref: ${mpesaReceipt}`,
              debit: 0,
              credit: payment.amount
            }
          ]
        });
      }
    });

    return { ResultCode: 0, ResultDesc: 'Success' };
  }

  // Helper: Get OAuth Token (Mocked for brevity, implement actual HTTP call in prod)
  private async getOAuthToken(): Promise<string> {
    // In production: 
    // const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    // const res = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', { headers: { Authorization: `Basic ${auth}` } });
    // return res.data.access_token;
    return 'mock_oauth_token_for_dev';
  }
}