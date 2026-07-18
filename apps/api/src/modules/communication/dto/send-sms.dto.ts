// apps/api/src/modules/communication/dto/send-sms.dto.ts
import { IsString, IsEnum, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({ enum: ['ALL_PARENTS', 'CLASS', 'INDIVIDUAL'] })
  @IsEnum(['ALL_PARENTS', 'CLASS', 'INDIVIDUAL'])
  recipient_type: string;

  @ApiProperty({ required: false })
  @IsArray() @IsOptional() @IsUUID('all', { each: true })
  recipient_ids?: string[]; // Student IDs or Parent IDs

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  class_id?: string; // Required if recipient_type is CLASS

  @ApiProperty()
  @IsString()
  message: string;
}