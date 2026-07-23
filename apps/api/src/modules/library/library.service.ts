// apps/api/src/modules/library/library.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // CATALOG MANAGEMENT
  // ==========================================
  async getBooks(schoolId: string) {
    return this.prisma.book.findMany({
      where: { school_id: schoolId, is_deleted: false },
      orderBy: { title: 'asc' }
    });
  }

  async createBook(schoolId: string, data: any) {
    if (!data.title || !data.author) {
      throw new BadRequestException('Title and Author are required');
    }

    const totalCopies = Number(data.total_copies) || 1;

    return this.prisma.book.create({
      data: {
        school_id: schoolId,
        isbn: data.isbn || '',
        title: data.title,
        author: data.author,
        barcode: data.barcode || `LIB-${Date.now()}`,
        category: data.category || 'General',
        total_copies: totalCopies,
        available_copies: totalCopies,
      }
    });
  }

  // ==========================================
  // CIRCULATION (BORROW / RETURN)
  // ==========================================
  async borrowBook(schoolId: string, bookIdentifier: string, studentIdentifier: string, dueDays: number) {
    // 1. Verify book exists by ID, Barcode, OR ISBN
    const book = await this.prisma.book.findFirst({
      where: { 
        school_id: schoolId, 
        is_deleted: false,
        OR: [
          { id: bookIdentifier },
          { barcode: bookIdentifier },
          { isbn: bookIdentifier }
        ]
      }
    });
    
    if (!book) throw new NotFoundException('Book not found. Please check the ID, Barcode, or ISBN.');
    if (book.available_copies <= 0) {
      throw new BadRequestException('Book is not available for borrowing (0 copies left)');
    }

    // 2. Verify student exists by ID OR Admission Number
    const student = await this.prisma.student.findFirst({
      where: { 
        school_id: schoolId, 
        is_deleted: false,
        OR: [
          { id: studentIdentifier },
          { admission_number: studentIdentifier }
        ]
      }
    });
    
    if (!student) throw new NotFoundException('Student not found. Please check the ID or Admission Number.');

    // 3. Create Loan Record
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const loan = await this.prisma.bookLoan.create({
      data: {
        school_id: schoolId,
        book_id: book.id, // Use the actual found ID
        student_id: student.id, // Use the actual found ID
        borrow_date: new Date(),
        due_date: dueDate,
        status: 'BORROWED'
      },
      include: { book: true, student: true }
    });

    // 4. Update Book: Decrement available_copies by 1
    await this.prisma.book.update({
      where: { id: book.id },
      data: { available_copies: { decrement: 1 } }
    });

    return { success: true, message: 'Book borrowed successfully', loan };
  }

  async returnBook(schoolId: string, loanId: string) {
    const loan = await this.prisma.bookLoan.findFirst({
      where: { id: loanId, school_id: schoolId },
      include: { book: true, student: true }
    });
    if (!loan) throw new NotFoundException('Loan record not found');
    if (loan.status === 'RETURNED') throw new BadRequestException('Book has already been returned');

    const today = new Date();
    let fineAmount = 0;
    if (today > loan.due_date) {
      const diffTime = Math.abs(today.getTime() - loan.due_date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fineAmount = diffDays * 50; // 50 KES per day
    }

    await this.prisma.bookLoan.update({
      where: { id: loanId },
      data: {
        return_date: today,
        status: 'RETURNED',
        fine_amount: fineAmount
      }
    });

    await this.prisma.book.update({
      where: { id: loan.book_id },
      data: { available_copies: { increment: 1 } }
    });

    return { success: true, message: 'Book returned successfully', fine_amount: fineAmount };
  }
}