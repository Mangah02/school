// apps/api/src/modules/finance/dto/fee-waiver.dto.ts
import { IsUUID, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class RequestWaiverDto {
  @IsUUID() invoice_id: string;
  @IsNumber() @Min(1) waiver_amount: number;
  @IsString() justification: string;
  
  // REQ-WAIVER-007: Mandatory if waiver > 50%
  @IsString() @IsOptional() board_resolution_url?: string; 
}

export class ProcessWaiverDto {
  @IsUUID() waiver_id: string;
  @IsString() action: 'APPROVE' | 'REJECT';
  @IsString() @IsOptional() rejection_reason?: string;
}