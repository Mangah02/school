// apps/api/src/modules/finance/dto/expense.dto.ts
import { IsString, IsNumber, IsUUID, IsDateString, IsEnum, IsOptional, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsUUID() category_id: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsString() description: string;
  @IsString() @IsOptional() vendor?: string;
  @IsDateString() incurred_date: string;
  @IsEnum(['CASH', 'BANK', 'MPESA']) payment_method: string;
  @IsEnum(['DRAFT', 'POSTED']) status: string;
}

export class CreateBudgetDto {
  @IsUUID() category_id: string;
  @IsUUID() academic_year_id: string;
  @IsNumber() @Min(0) allocated_amount: number;
}