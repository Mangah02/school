// apps/api/src/modules/finance/dto/record-payment.dto.ts
import { IsUUID, IsNumber, IsString, IsEnum, Min } from 'class-validator';

export class RecordPaymentDto {
  @IsUUID() invoice_id: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsEnum(['MPESA', 'CASH', 'BANK', 'CARD']) method: string;
  @IsString() reference: string; // e.g., MPESA Receipt No
}