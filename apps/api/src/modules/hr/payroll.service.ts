// apps/api/src/modules/hr/payroll.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  /**
   * Processes monthly payroll for all active staff, calculates statutory deductions,
   * and posts immutable double-entry journals.
   */
  async processMonthlyPayroll(month: number, year: number) {
    const context = tenantStorage.getStore();

    const staffList = await this.prisma.staff.findMany({
      where: { school_id: context.schoolId, is_deleted: false }
    });

    const transactionId = uuidv4(); // Group all payroll journals under one transaction ID

    return this.prisma.$transaction(async (tx) => {
      let totalNetPay = 0;
      let totalPaye = 0;
      let totalNssf = 0;
      let totalNhif = 0;

      for (const staff of staffList) {
        // Check if already processed
        const existing = await tx.payrollRecord.findUnique({
          where: { staff_id_month_year: { staff_id: staff.id, month, year } }
        });
        if (existing) continue;

        // 1. Calculate Deductions (Simplified Kenyan Statutory Logic)
        const basicPay = staff.basic_salary;
        const allowances = 0; // Placeholder for housing/transport
        
        // Mock statutory calculations (In production, use exact KRA/NSSF/SHIF tables)
        const paye = basicPay * 0.25; // Simplified 25% PAYE
        const nssf = 2160; // Tier 1 & 2 max cap mock
        const nhif = 1700; // SHIF/NHIF mock
        
        const netPay = basicPay + allowances - paye - nssf - nhif;

        // 2. Create Payroll Record
        await tx.payrollRecord.create({
          data: {
            school_id: context.schoolId,
            staff_id: staff.id,
            month, year,
            basic_pay: basicPay,
            allowances,
            paye_deduction: paye,
            nssf_deduction: nssf,
            nhif_deduction: nhif,
            net_pay: netPay,
            status: 'POSTED'
          }
        });

        totalNetPay += netPay;
        totalPaye += paye;
        totalNssf += nssf;
        totalNhif += nhif;
      }

      // 3. Post Aggregate Double-Entry Journals
      const totalGross = totalNetPay + totalPaye + totalNssf + totalNhif;

      await tx.journalEntry.createMany({
        data: [
          // Debit Salary Expense (Total Gross)
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: '6000_SALARY_EXPENSE',
            description: `Monthly Payroll ${month}/${year}`,
            debit: totalGross,
            credit: 0
          },
          // Credit Bank/Cash (Net Pay)
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: '1010_BANK_CASH',
            description: `Monthly Payroll ${month}/${year}`,
            debit: 0,
            credit: totalNetPay
          },
          // Credit PAYE Payable (Liability)
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: '2100_PAYE_PAYABLE',
            description: `Monthly Payroll ${month}/${year}`,
            debit: 0,
            credit: totalPaye
          },
          // Credit NSSF Payable (Liability)
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: '2110_NSSF_PAYABLE',
            description: `Monthly Payroll ${month}/${year}`,
            debit: 0,
            credit: totalNssf
          },
          // Credit NHIF/SHIF Payable (Liability)
          {
            school_id: context.schoolId,
            transaction_id: transactionId,
            account_code: '2120_NHIF_PAYABLE',
            description: `Monthly Payroll ${month}/${year}`,
            debit: 0,
            credit: totalNhif
          }
        ]
      });

      return { success: true, transaction_id: transactionId, total_net_pay: totalNetPay };
    });
  }
}