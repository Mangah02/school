// apps/api/src/modules/library/library.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  async borrowBook(bookId: string, studentId: string, dueDays: number) {
    const context = tenantStorage.getStore();

    return this.prisma.$transaction(async (tx) => {
      const book = await tx.book.findFirst({
        where: { id: bookId, school_id: context.schoolId, is_deleted: false }
      });
      if (!book) throw new NotFoundException('Book not found');
      if (book.available_copies <= 0) throw new BadRequestException('No copies available for borrowing');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);

      // 1. Create Loan Record
      await tx.bookLoan.create({
        data: {
          school_id: context.schoolId,
          book_id: bookId,
          student_id: studentId,
          due_date: dueDate,
          status: 'BORROWED'
        }
      });

      // 2. Decrement Available Copies
      await tx.book.update({
        where: { id: bookId },
        data: { available_copies: { decrement: 1 } }
      });

      return { success: true, message: `Book borrowed successfully. Due: ${dueDate.toDateString()}` };
    });
  }

  async returnBook(loanId: string) {
    const context = tenantStorage.getStore();
    const FINE_PER_DAY = 50; // KES 50 per day overdue

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.bookLoan.findFirst({
        where: { id: loanId, school_id: context.schoolId },
        include: { book: true }
      });
      if (!loan) throw new NotFoundException('Loan record not found');
      if (loan.status === 'RETURNED') throw new BadRequestException('Book already returned');

      const now = new Date();
      let fineAmount = 0;

      // Calculate Fine if overdue
      if (now > loan.due_date) {
        const diffTime = Math.abs(now.getTime() - loan.due_date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fineAmount = diffDays * FINE_PER_DAY;
      }

      // 1. Update Loan Record
      await tx.bookLoan.update({
        where: { id: loanId },
        data: {
          return_date: now,
          status: fineAmount > 0 ? 'OVERDUE' : 'RETURNED',
          fine_amount: fineAmount
        }
      });

      // 2. Increment Available Copies
      await tx.book.update({
        where: { id: loan.book_id },
        data: { available_copies: { increment: 1 } }
      });

      return { success: true, fine_amount: fineAmount, message: fineAmount > 0 ? `Book returned. Fine: KES ${fineAmount}` : 'Book returned successfully' };
    });
  }
}