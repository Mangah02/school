// apps/api/src/modules/billing/webhook.controller.ts
import { Controller, Post, Body, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Public } from '../../core/guards/public.decorator';
import { ApiTags } from '@nestjs/swagger';
import * as crypto from 'crypto';

@ApiTags('Billing Webhooks')
@Controller('billing/webhooks')
export class WebhookController {
  constructor(
    private subscriptionService: SubscriptionService,
    private prisma: PrismaService,
  ) {}

  /**
   * Stripe Webhook for Subscription Renewals
   */
  @Public()
  @Post('stripe')
  async handleStripeWebhook(@Headers('stripe-signature') signature: string, @Req() req: RawBodyRequest<Request>) {
    // In production: Use stripe.webhooks.constructEvent(req.rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
    // Mock implementation for structure:
    const event = req.body; 
    
    if (event.type === 'invoice.payment_succeeded') {
      const customerId = event.data.object.customer;
      // Find school by external_customer_id
      const sub = await this.prisma.schoolSubscription.findFirst({ where: { external_customer_id: customerId } });
      if (sub) {
        await this.subscriptionService.updatePlan(sub.school_id, sub.plan_tier, customerId);
      }
    }
    return { received: true };
  }

  /**
   * MPESA Paybill Webhook for School Subscription Top-ups
   */
  @Public()
  @Post('mpesa-paybill')
  async handleMpesaPaybill(@Body() body: any) {
    // Validate payload structure (Safaricom B2C/C2B callback format)
    const { BusinessShortCode, AccountReference, Amount, TransID } = body;

    // AccountReference should contain the School's unique code or ID
    const school = await this.prisma.school.findFirst({ where: { kms_code: AccountReference } });
    if (!school) return { ResultCode: 1, ResultDesc: 'School not found' };

    // Update subscription or add credit
    await this.prisma.schoolSubscription.upsert({
      where: { school_id: school.id },
      update: { 
        status: 'ACTIVE', 
        grace_period_ends_at: null,
        payment_method: 'MPESA_PAYBILL'
      },
      create: {
        school_id: school.id,
        plan_tier: 'STANDARD', // Default fallback
        status: 'ACTIVE',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        payment_method: 'MPESA_PAYBILL'
      }
    });

    // Audit log the subscription payment
    await this.prisma.auditLog.create({
      data: {
        school_id: school.id,
        action: 'SUBSCRIPTION_PAYMENT',
        entity_type: 'SchoolSubscription',
        new_values: { amount: Amount, trans_id: TransID, method: 'MPESA_PAYBILL' }
      }
    });

    return { ResultCode: 0, ResultDesc: 'Success' };
  }
}