// apps/api/src/modules/hr/dto/create-staff.dto.ts
import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, IsEmail, Matches } from 'class-validator';

export class CreateStaffDto {
  @IsString() first_name: string;
  @IsString() last_name: string;
  @IsDateString() date_of_birth: string;
  @IsEnum(['M', 'F', 'O']) gender: string;
  @IsString() national_id: string; // Will be encrypted
  @IsString() phone: string;
  @IsEmail() email: string;
  
  @IsString() @IsOptional() tsc_number?: string; // Only for Teachers
  
  @IsString() @IsOptional() kra_pin?: string; // Will be encrypted
  @IsString() @IsOptional() nssf_number?: string; // Will be encrypted
  @IsString() @IsOptional() nhif_number?: string; // Will be encrypted
  @IsString() @IsOptional() bank_account?: string; // Will be encrypted
  
  @IsNumber() basic_salary: number;
  @IsEnum(['PERMANENT', 'CONTRACT', 'PART_TIME']) employment_type: string;
  @IsDateString() date_joined: string;
  
  // Linked to an existing User account
  @IsString() user_id: string; 
}