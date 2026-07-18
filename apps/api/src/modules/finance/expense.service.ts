// apps/api/src/modules/finance/expense.service.ts
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StorageService } from '../../core/storage/storage.service';
import { CreateExpenseDto, CreateBudgetDto } from './dto/expense.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExpenseService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async createCategory(name: string, code: string) {
    const context = tenantStorage.getStore();
    try {
      return await this.prisma.expenseCategory.create({
        data: { school_id: context.schoolId, name, code }
      });
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('Category code already exists');
      throw error;
    }
  }

  /**
   * Records an expense, uploads receipt to MinIO, and auto-posts double-entry journals.
   */
  async recordExpense(dto: CreateExpenseDto, fileBuffer: Buffer | null, originalName: string | null, userId: string) {
    const context = tenantStorage.getStore();

    // 1. Upload Receipt to MinIO (if provided)
    let receiptUrl = null;
    if (fileBuffer && originalName) {
      const fileName = `expenses/${context.schoolId}/${Date.now()}-${originalName}`;
      receiptUrl = await this.storage.uploadBuffer(fileName, fileBuffer, 'application/octet-stream');
    }

    // 2. Create Expense Record
    const expense = await this.prisma.expense.create({
      data: {
        ...dto,
        incurred_date: new Date(dto.incurred_date),
        school_id: context.schoolId,
        receipt_url: receiptUrl,
        recorded_by: userId,
      }
    });

    // 3. Auto-Post Double-Entry Journals if Status is POSTED
    if (dto.status === 'POSTED') {
      const category = await this.prisma.expenseCategory.findUnique({ where: { id: dto.category_id } });
      if (!category) throw new BadRequestException('Invalid expense category');

      const transactionId = uuidv4();
      
      // Determine credit account based on payment method (Asset reduction)
      const creditAccount = dto.payment_method === 'MPESA' ? '1050_MPESA_CLEARING' : 
                            dto.payment_method === 'BANK' ? '1010_BANK_CASH' : '1020_PETTY_CASH';

      // Format account code: e.g., 5010_UTILITIES
      const expenseAccountCode = `${category.code}_${category.name.toUpperCase().replace(/\s+/g, '_')}`;

      await this.prisma.journalEntry.createMany({
        data: [
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: expenseAccountCode,
            description: `Expense: ${dto.description} (Vendor: ${dto.vendor || 'N/A'})`,
            debit: dto.amount,   // Expense increases (Debit)
            credit: 0
          },
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: creditAccount,
            description: `Expense: ${dto.description} (Vendor: ${dto.vendor || 'N/A'})`,
            debit: 0,
            credit: dto.amount  // Asset decreases (Credit)
          }
        ]
      });
    }

    return expense;
  }

  async setBudget(dto: CreateBudgetDto) {
    const context = tenantStorage.getStore();
    return this.prisma.budget.upsert({
      where: {
        school_id_category_id_academic_year_id: {
          school_id: context.schoolId,
          category_id: dto.category_id,
          academic_year_id: dto.academic_year_id
        }
      },
      update: { allocated_amount: dto.allocated_amount },
      create: { ...dto, school_id: context.schoolId }
    });
  }

  /**
   * Generates Budget vs Actual report by querying the immutable Journal Entries.
   */
  async getBudgetVsActual(academicYearId: string) {
    const context = tenantStorage.getStore();
    
    const budgets = await this.prisma.budget.findMany({
      where: { school_id: context.schoolId, academic_year_id: academicYearId },
      include: { category: true }
    });

    const report = [];
    for (const budget of budgets) {
      // Fetch actuals from Journal Entries for this specific expense category code prefix
      const actuals = await this.prisma.journalEntry.aggregate({
        where: { 
          school_id: context.schoolId, 
          account_code: { startsWith: `${budget.category.code}_` },
        },
        _sum: { debit: true } // Expenses are recorded as debits
      });

      const actualAmount = actuals._sum.debit || 0;

      report.push({
        category: budget.category.name,
        code: budget.category.code,
        allocated: budget.allocated_amount,
        actual: actualAmount,
        variance: budget.allocated_amount - actualAmount,
        utilization_percent: budget.allocated_amount > 0 ? (actualAmount / budget.allocated_amount) * 100 : 0
      });
    }

    return report;
  }
}