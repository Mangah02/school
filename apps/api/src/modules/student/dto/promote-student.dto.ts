// apps/api/src/modules/student/dto/promote-student.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class PromoteStudentDto {
  @IsString() student_id: string;
  @IsString() new_class_id: string;
  @IsString() @IsOptional() new_stream_id?: string;
  @IsString() @IsOptional() reason?: string; // Mandatory for audit
  
  // If changing curriculum track (e.g., 844 to CBC transition)
  @IsEnum(['CBC', '844', 'TRANSITIONAL']) @IsOptional() new_curriculum_type?: string;
}