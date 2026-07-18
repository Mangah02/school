// apps/api/src/modules/student/dto/admit-student.dto.ts
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsDateString, IsEnum, IsArray, ValidateNested, IsEmail, IsBoolean } from 'class-validator';

class PersonalInfoDto {
  @IsString() first_name: string;
  @IsString() @IsOptional() middle_name?: string;
  @IsString() last_name: string;
  @IsDateString() date_of_birth: string;
  @IsEnum(['M', 'F', 'O']) gender: string;
  @IsString() nationality: string;
  @IsString() @IsOptional() blood_group?: string;
  @IsString() @IsOptional() medical_condition?: string;
  @IsString() @IsOptional() photo_url?: string; // MinIO URL
}

class AcademicInfoDto {
  @IsString() class_id: string;
  @IsString() @IsOptional() stream_id?: string;
  @IsString() @IsOptional() previous_school?: string;
  @IsString() @IsOptional() transfer_cert_no?: string;
  @IsEnum(['CBC', '844', 'TRANSITIONAL']) @IsOptional() curriculum_type?: string;
}

class GuardianDto {
  @IsString() first_name: string;
  @IsString() last_name: string;
  @IsString() phone: string;
  @IsEmail() @IsOptional() email?: string;
  @IsEnum(['FATHER', 'MOTHER', 'GUARDIAN']) relationship: string;
  @IsBoolean() @IsOptional() is_primary?: boolean;
}

export class AdmitStudentDto {
  @Type(() => PersonalInfoDto) @ValidateNested() personal: PersonalInfoDto;
  @Type(() => AcademicInfoDto) @ValidateNested() academic: AcademicInfoDto;
  @Type(() => GuardianDto) @ValidateNested() @IsArray() guardians: GuardianDto[];
}