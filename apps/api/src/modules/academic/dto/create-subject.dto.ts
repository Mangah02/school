// apps/api/src/modules/academic/dto/create-subject.dto.ts
import { IsString, IsBoolean, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() @Matches(/^[A-Z]{2,5}$/, { message: 'Code must be 2-5 uppercase letters' }) code: string;
  @ApiProperty() @IsBoolean() @IsOptional() is_cbc?: boolean;
}