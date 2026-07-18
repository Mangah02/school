// apps/api/src/modules/finance/dto/journal-correction.dto.ts
import { IsString, IsUUID } from 'class-validator';

export class ReverseTransactionDto {
  @IsUUID() original_transaction_id: string;
  @IsString() reason: string; // Mandatory for audit trail
}