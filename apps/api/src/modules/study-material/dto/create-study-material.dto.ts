// apps/api/src/modules/study-material/dto/create-study-material.dto.ts
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudyMaterialDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() @IsOptional() description?: string;
  @ApiProperty({ enum: ['PDF', 'DOC', 'VIDEO', 'LINK'] }) @IsEnum(['PDF', 'DOC', 'VIDEO', 'LINK']) file_type: string;
  @ApiProperty({ enum: ['CLASS', 'ALL_STUDENTS', 'TEACHERS'] }) @IsEnum(['CLASS', 'ALL_STUDENTS', 'TEACHERS']) visibility: string;
  
  @ApiProperty() @IsUUID() @IsOptional() class_id?: string;
  @ApiProperty() @IsUUID() @IsOptional() subject_id?: string;
  
  // Passed from the controller after MinIO upload
  file_url: string; 
}