// apps/api/src/modules/finance/dto/initiate-stk-push.dto.ts
import { IsUUID, IsString, Matches, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateStkPushDto {
  @ApiProperty() @IsUUID() invoice_id: string;
  
  @ApiProperty({ example: '254712345678' })
  @IsString()
  @Matches(/^254\d{9}$/, { message: 'Phone number must be in 2547XXXXXXXX format' })
  phone_number: string;
  
  @ApiProperty() @IsNumber() @Min(1) amount: number;
}