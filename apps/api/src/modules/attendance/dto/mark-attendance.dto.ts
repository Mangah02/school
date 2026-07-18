// apps/api/src/modules/attendance/dto/mark-attendance.dto.ts
import { IsArray, ValidateNested, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class StudentAttendanceDto {
  @IsEnum(['PRESENT', 'ABSENT_EXCUSED', 'ABSENT_UNEXCUSED', 'LATE'])
  status: string;

  student_id: string;
  
  // Offline Sync (REQ-SYNC-001)
  @IsDateString() @IsOptional() client_updated_at?: string;
}

export class MarkAttendanceDto {
  @IsDateString() date: string;
  @IsArray() @ValidateNested({ each: true })
  @Type(() => StudentAttendanceDto)
  records: StudentAttendanceDto[];
}