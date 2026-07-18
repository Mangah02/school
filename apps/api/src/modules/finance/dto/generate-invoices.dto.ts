// apps/api/src/modules/finance/dto/generate-invoices.dto.ts
import { IsUUID, IsDateString } from 'class-validator';

export class GenerateInvoicesDto {
  @IsUUID() fee_structure_id: string;
  @IsUUID() class_id: string;
  @IsDateString() due_date: string;
}