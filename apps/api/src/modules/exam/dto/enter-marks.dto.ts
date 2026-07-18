// apps/api/src/modules/exam/dto/enter-marks.dto.ts
import { IsArray, ValidateNested, IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class MarkEntryDto {
  @ApiProperty() @IsString() student_id: string;
  @ApiProperty() @IsString() subject_id: string;
  @ApiProperty() @IsNumber() @Min(0) marks_obtained: number;
  @ApiProperty() @IsNumber() @Max(100) max_marks: number;
}

export class EnterMarksDto {
  @ApiProperty() @IsString() exam_id: string;
  @ApiProperty({ type: [MarkEntryDto] })
  @IsArray() @ValidateNested({ each: true })
  @Type(() => MarkEntryDto)
  marks: MarkEntryDto[];
}