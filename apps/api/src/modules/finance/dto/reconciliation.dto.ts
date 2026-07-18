// apps/api/src/modules/finance/dto/reconciliation.dto.ts
import { IsUUID, IsString, Matches } from 'class-validator';

export class ManualConfirmPaymentDto {
  @IsUUID() payment_id: string;
  
  // REQ-MPESA-008: Safaricom M-PESA transaction ID format (10 alphanumeric chars)
  @IsString()
  @Matches(/^[A-Z0-9]{10}$/, { message: 'Invalid Safaricom Receipt Format. Must be 10 alphanumeric characters.' })
  mpesa_receipt: string;
  
  @IsString() justification: string;
}

export class RejectPaymentDto {
  @IsUUID() payment_id: string;
  @IsString() reason: string;
}