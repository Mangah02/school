// apps/api/src/modules/communication/dto/send-email.dto.ts
import { IsString, IsEnum, IsOptional, IsArray, IsUUID, IsEmail } from 'class-validator';

export class SendEmailDto {
  @IsEnum(['ALL_PARENTS', 'CLASS', 'INDIVIDUAL', 'STAFF'])
  recipient_type: string;

  @IsArray() @IsOptional() @IsUUID('all', { each: true })
  recipient_ids?: string[];

  @IsString() @IsOptional()
  class_id?: string;

  @IsString() subject: string;
  @IsString() body: string; // Can contain HTML
}