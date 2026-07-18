// apps/api/src/modules/academic/dto/assign-subject.dto.ts
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class AssignSubjectDto {
  @IsString() class_id: string;
  @IsString() subject_id: string;
  @IsBoolean() @IsOptional() is_compulsory?: boolean;
  @IsString() @IsOptional() teacher_id?: string;
}