// apps/api/src/modules/finance/invoicing.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * REQ-MPESA-012 & Accounting: Generates invoices for all active students in a class.
   * Automatically creates double-entry journal lines.
   */
  async generateClassInvoices(dto: GenerateInvoicesDto) {
    const context = tenantStorage.getStore();
    const dueDate = new Date(dto.due_date);

    // 1. Fetch Fee Structure and Students
    const feeStructure = await this.prisma.feeStructure.findFirst({
      where: { id: dto.fee_structure_id, school_id: context.schoolId, class_id: dto.class_id },
      include: { categories: true }
    });
    if (!feeStructure) throw new BadRequestException('Fee structure not found for this class');

    const students = await this.prisma.student.findMany({
      where: { stream: { class_id: dto.class_id }, school_id: context.schoolId, is_deleted: false, status: 'ACTIVE' }
    });

    if (students.length === 0) throw new BadRequestException('No active students found in this class');

    // 2. Generate Invoices and Journal Entries in a single transaction
    return this.prisma.$transaction(async (tx) => {
      const createdInvoices = [];

      for (const student of students) {
        // Check if invoice already exists to prevent duplicates
        const existing = await tx.invoice.findFirst({
          where: { student_id: student.id, fee_structure_id: feeStructure.id }
        });
        if (existing) continue;

        const invoice = await tx.invoice.create({
          data: {
            school_id: context.schoolId,
            student_id: student.id,
            fee_structure_id: feeStructure.id,
            term_id: feeStructure.term_id,
            total_amount: feeStructure.total_amount,
            due_date: dueDate,
            status: 'UNPAID'
          }
        });

        // DOUBLE-ENTRY: Debit Fee Receivable (Asset), Credit Fee Income (Revenue)
        const transactionId = uuidv4();
        await tx.journalEntry.createMany({
          data: [
            {
              school_id: context.schoolId,
              transaction_id: transactionId,
              account_code: '1000_FEE_RECEIVABLE',
              description: `Term Fees Invoice for ${student.first_name} ${student.last_name}`,
              debit: feeStructure.total_amount,
              credit: 0
            },
            {
              school_id: context.schoolId,
              transaction_id: transactionId,
              account_code: '4000_FEE_INCOME',
              description: `Term Fees Invoice for ${student.first_name} ${student.last_name}`,
              debit: 0,
              credit: feeStructure.total_amount
            }
          ]
        });

        createdInvoices.push(invoice);
      }

      return { generated_count: createdInvoices.length, invoices: createdInvoices };
    });
  }

  /**
   * Records a payment, updates invoice status, and posts double-entry journals.
   * Enforces strict accounting rules.
   */
  async recordPayment(dto: RecordPaymentDto, userId: string) {
    const context = tenantStorage.getStore();

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoice_id, school_id: context.schoolId, status: { not: 'VOID' } }
    });
    if (!invoice) throw new BadRequestException('Invoice not found or voided');

    const outstandingBalance = invoice.total_amount - invoice.paid_amount - invoice.waived_amount;
    if (dto.amount > outstandingBalance + 0.01) { // +0.01 for floating point tolerance
      throw new BadRequestException(`Payment amount exceeds outstanding balance of ${outstandingBalance}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Invoice
      const newPaidAmount = invoice.paid_amount + dto.amount;
      const newStatus = newPaidAmount >= invoice.total_amount ? 'PAID' : 'PARTIAL';

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paid_amount: newPaidAmount, status: newStatus }
      });

      // 2. Record Payment
      await tx.payment.create({
        data: {
          school_id: context.schoolId,
          invoice_id: invoice.id,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          status: 'SUCCESS',
          mpesa_state: dto.method === 'MPESA' ? 'SUCCESS' : null
        }
      });

      // 3. DOUBLE-ENTRY: Debit Bank/MPESA Clearing (Asset), Credit Fee Receivable (Asset)
      const transactionId = uuidv4();
      const bankAccount = dto.method === 'MPESA' ? '1050_MPESA_CLEARING' : '1010_BANK_CASH';
      
      await tx.journalEntry.createMany({
        data: [
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: bankAccount,
            description: `Fee Payment Ref: ${dto.reference}`,
            debit: dto.amount,
            credit: 0
          },
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: '1000_FEE_RECEIVABLE',
            description: `Fee Payment Ref: ${dto.reference}`,
            debit: 0,
            credit: dto.amount
          }
        ]
      });

      return { success: true, new_balance: invoice.total_amount - newPaidAmount };
    });
  }

  /**
   * REQ-MPESA-012: FIFO Allocation for unallocated bulk payments.
   * Applies payment to the oldest outstanding invoice first.
   */
  async allocateUnallocatedPayment(studentId: string, totalAmount: number, method: string, reference: string) {
    const context = tenantStorage.getStore();
    let remainingAmount = totalAmount;

    // Fetch oldest unpaid/partial invoices first (FIFO)
    const outstandingInvoices = await this.prisma.invoice.findMany({
      where: { 
        student_id: studentId, 
        school_id: context.schoolId, 
        status: { in: ['UNPAID', 'PARTIAL'] } 
      },
      orderBy: { created_at: 'asc' } // FIFO: Oldest first
    });

    if (outstandingInvoices.length === 0) {
      throw new BadRequestException('No outstanding invoices found for this student');
    }

    for (const invoice of outstandingInvoices) {
      if (remainingAmount <= 0) break;

      const invoiceBalance = invoice.total_amount - invoice.paid_amount - invoice.waived_amount;
      const allocationAmount = Math.min(remainingAmount, invoiceBalance);

      // Recursively call recordPayment for each allocated chunk
      await this.recordPayment({
        invoice_id: invoice.id,
        amount: allocationAmount,
        method,
        reference: `${reference}-FIFO`
      }, 'SYSTEM_FIFO');

      remainingAmount -= allocationAmount;
    }

    if (remainingAmount > 0.01) {
      this.logger.warn(`Unallocated balance of ${remainingAmount} remains for student ${studentId}`);
    }

    return { success: true, unallocated_remainder: remainingAmount };
  }
}