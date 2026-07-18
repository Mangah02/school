// apps/api/src/modules/finance/expense.controller.ts
import { Controller, Post, Body, Get, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto, CreateBudgetDto } from './dto/expense.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Finance - Expenses & Budgets')
@Controller('finance/expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post('categories')
  @Permissions('finance:expense:manage')
  async createCategory(@Body() body: { name: string, code: string }) {
    return this.expenseService.createCategory(body.name, body.code);
  }

  @Post()
  @Permissions('finance:expense:record')
  @AuditEntity('Expense')
  @UseInterceptors(FileInterceptor('receipt')) // Handles multipart/form-data
  @ApiConsumes('multipart/form-data')
  async recordExpense(
    @Body() dto: CreateExpenseDto,
    @UploadedFile() file: Express.Multer.File | null,
    @Request() req
  ) {
    return this.expenseService.recordExpense(
      dto, 
      file ? file.buffer : null, 
      file ? file.originalname : null, 
      req.user.id
    );
  }

  @Post('budgets')
  @Permissions('finance:budget:manage')
  @AuditEntity('Budget')
  async setBudget(@Body() dto: CreateBudgetDto) {
    return this.expenseService.setBudget(dto);
  }

  @Get('budget-vs-actual')
  @Permissions('finance:report:view')
  async getBudgetReport(@Query('academic_year_id') academicYearId: string) {
    return this.expenseService.getBudgetVsActual(academicYearId);
  }
}