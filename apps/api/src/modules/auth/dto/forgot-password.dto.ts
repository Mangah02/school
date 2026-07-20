import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@school.ke' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}