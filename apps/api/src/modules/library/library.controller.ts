// apps/api/src/modules/library/library.controller.ts
import { Controller, Post, Body, Param } from '@nestjs/common';
import { LibraryService } from './library.service';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Library')
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post('borrow')
  @Permissions('library:loan:create')
  @AuditEntity('BookLoan')
  async borrow(@Body() body: { book_id: string, student_id: string, due_days: number }) {
    return this.libraryService.borrowBook(body.book_id, body.student_id, body.due_days);
  }

  @Post('return/:loanId')
  @Permissions('library:loan:update')
  @AuditEntity('BookLoan')
  async return(@Param('loanId') loanId: string) {
    return this.libraryService.returnBook(loanId);
  }
}