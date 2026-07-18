// apps/api/src/modules/extra-curricular/dto/create-club.dto.ts
import { IsString, IsEnum, IsUUID, IsOptional } from 'class-validator';

export class CreateClubDto {
  @IsString() name: string;
  @IsEnum(['SPORT', 'CULTURAL', 'ACADEMIC', 'RELIGIOUS']) type: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() meeting_schedule?: string;
  @IsUUID() patron_teacher_id: string;
}

export class AddClubMemberDto {
  @IsUUID() student_id: string;
  @IsEnum(['MEMBER', 'LEADER', 'CAPTAIN']) @IsOptional() role?: string;
}