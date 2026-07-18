// apps/api/src/modules/student/dto/create-school.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSchoolDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() @IsOptional() kms_code?: string;
  @ApiProperty({ enum: ['CBC', '844', 'BOTH'] }) @IsEnum(['CBC', '844', 'BOTH']) curriculum_type: string;
  @ApiProperty() @IsString() admin_email: string;
  @ApiProperty() @IsString() admin_first_name: string;
  @ApiProperty() @IsString() admin_last_name: string;
}