// apps/api/src/modules/hr/dto/leave-request.dto.ts
import { IsString, IsDateString, IsEnum } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsEnum(['ANNUAL', 'SICK', 'MATERNITY', 'EMERGENCY', 'UNPAID']) leave_type: string;
  @IsDateString() start_date: string;
  @IsDateString() end_date: string;
  @IsString() reason: string;
}