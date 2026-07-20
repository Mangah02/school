// apps/api/src/modules/finance/journal.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common'; // ✅ Added UnauthorizedException
import { PrismaService } from '../../core/prisma/prisma.service';
import { ReverseTransactionDto } from './dto/journal-correction.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * REQ-DEL-001 / Accounting Standard: Journal entries are immutable.
   * To correct a mistake, we create a REVERSING entry (swapping debits and credits)
   * that zeroes out the original transaction.
   */
  async reverseTransaction(dto: ReverseTransactionDto, userId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    // 1. Fetch original entries
    const originalEntries = await this.prisma.journalEntry.findMany({
      where: { transaction_id: dto.original_transaction_id, school_id: context.schoolId }
    });

    if (originalEntries.length === 0) {
      throw new NotFoundException('Original transaction not found in this school');
    }

    // 2. Prevent double-reversal
    const existingReversal = await this.prisma.journalEntry.findFirst({
      where: { reverses_transaction_id: dto.original_transaction_id, school_id: context.schoolId }
    });
    if (existingReversal) {
      throw new BadRequestException('This transaction has already been reversed');
    }

    const newTransactionId = uuidv4();

    // 3. Create reversal entries (Strictly swap debit and credit)
    const reversalEntries = originalEntries.map(entry => ({
      school_id: context.schoolId,
      transaction_id: newTransactionId,
      account_code: entry.account_code,
      description: `REVERSAL: ${entry.description}. Reason: ${dto.reason}`,
      debit: entry.credit,   // SWAPPED
      credit: entry.debit,   // SWAPPED
      reverses_transaction_id: dto.original_transaction_id
    }));

    await this.prisma.journalEntry.createMany({ data: reversalEntries });

    // 4. Audit Log the correction
    await this.prisma.auditLog.create({
      data: {
        school_id: context.schoolId,
        user_id: userId,
        action: 'JOURNAL_REVERSAL',
        entity_type: 'JournalEntry',
        entity_id: dto.original_transaction_id,
        new_values: { reason: dto.reason, new_transaction_id: newTransactionId },
        ip_address: 'SYSTEM' // Interceptor will override if available
      }
    });

    this.logger.log(`Transaction ${dto.original_transaction_id} reversed by ${userId}`);
    return { success: true, reversal_transaction_id: newTransactionId };
  }
}