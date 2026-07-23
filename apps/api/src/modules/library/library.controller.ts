// apps/api/src/modules/library/library.controller.ts
import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';

@ApiTags('Library')
@Controller('library')
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  // --- CATALOG MANAGEMENT ---
  @Get('books')
  @ApiOperation({ summary: 'Get all books in the library catalog' })
  async getBooks(@Req() req: Request & { user: any }) {
    return this.libraryService.getBooks(req.user.school_id);
  }

  @Post('books')
  @ApiOperation({ summary: 'Add a new book to the catalog' })
  async createBook(@Req() req: Request & { user: any }, @Body() body: any) {
    return this.libraryService.createBook(req.user.school_id, body);
  }

  // --- CIRCULATION ---
  @Post('borrow')
  @ApiOperation({ summary: 'Borrow a book' })
  async borrowBook(
    @Req() req: Request & { user: any },
    @Body() body: { book_id: string; student_id: string; due_days: number }
  ) {
    return this.libraryService.borrowBook(
      req.user.school_id,
      body.book_id,
      body.student_id,
      body.due_days || 14
    );
  }

  @Post('return/:loanId')
  @ApiOperation({ summary: 'Return a borrowed book' })
  async returnBook(
    @Req() req: Request & { user: any },
    @Param('loanId') loanId: string
  ) {
    return this.libraryService.returnBook(req.user.school_id, loanId);
  }
}