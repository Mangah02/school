// apps/api/src/workers/__tests__/sms.processor.spec.ts
import { SmsProcessor } from '../sms.processor';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SmsProvider } from '../../modules/communication/providers/sms.provider';
import { Queue } from 'bull';

describe('SmsProcessor - Retry & Fallback Logic (Risk R-010)', () => {
  let processor: SmsProcessor;
  let prisma: PrismaService;
  let smsProvider: SmsProvider;
  let emailQueue: Queue;

  beforeEach(async () => {
    prisma = {
      messageLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }), update: jest.fn() },
    } as any;
    smsProvider = { sendSms: jest.fn() } as any;
    emailQueue = { add: jest.fn() } as any;
    
    processor = new SmsProcessor(prisma, smsProvider, emailQueue);
  });

  it('should send SMS successfully and update log to SENT', async () => {
    jest.spyOn(smsProvider, 'sendSms').mockResolvedValue('AT_MSG_123');
    const job = { data: { recipient_contact: '254712345678', message: 'Test' }, attemptsMade: 0, opts: { attempts: 3 } } as any;

    await processor.handleSms(job);

    expect(prisma.messageLog.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SENT' })
    }));
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it('should throw error to trigger Bull retry if not the final attempt', async () => {
    jest.spyOn(smsProvider, 'sendSms').mockRejectedValue(new Error('Network Error'));
    const job = { data: { recipient_contact: '254712345678', message: 'Test' }, attemptsMade: 1, opts: { attempts: 3 } } as any;

    await expect(processor.handleSms(job)).rejects.toThrow('Network Error');
    expect(emailQueue.add).not.toHaveBeenCalled(); // No fallback yet
  });

  it('should trigger EMAIL fallback if SMS fails on the FINAL attempt', async () => {
    jest.spyOn(smsProvider, 'sendSms').mockRejectedValue(new Error('Network Error'));
    // attemptsMade is 2, which is opts.attempts (3) - 1. This is the final attempt.
    const job = { data: { recipient_contact: '254712345678', message: 'Urgent' }, attemptsMade: 2, opts: { attempts: 3 } } as any;

    await expect(processor.handleSms(job)).rejects.toThrow('Network Error');

    // Verify fallback was triggered
    expect(prisma.messageLog.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'FALLBACK_TRIGGERED' })
    }));
    expect(emailQueue.add).toHaveBeenCalledWith('send-email', expect.objectContaining({
      subject: 'Urgent School Notification (SMS Delivery Failed)',
      is_fallback: true,
    }));
  });
});