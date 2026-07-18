// apps/api/src/modules/finance/dto/create-fee-structure.dto.ts
import { IsString, IsNumber, IsArray, ValidateNested, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class FeeCategoryDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsNumber() @Min(0) amount: number;
}

export class CreateFeeStructureDto {
  @ApiProperty() @IsUUID() academic_year_id: string;
  @ApiProperty() @IsUUID() term_id: string;
  @ApiProperty() @IsUUID() class_id: string;
  @ApiProperty() @IsString() name: string;
  
  @ApiProperty({ type: [FeeCategoryDto] })
  @IsArray() @ValidateNested({ each: true })
  @Type(() => FeeCategoryDto)
  categories: FeeCategoryDto[];
}