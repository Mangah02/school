// apps/api/src/modules/extra-curricular/extra-curricular.service.ts
import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateClubDto, AddClubMemberDto } from './dto/create-club.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class ExtraCurricularService {
  constructor(private prisma: PrismaService) {}

  async createClub(dto: CreateClubDto) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    return this.prisma.club.create({
      data: { ...dto, school_id: context.schoolId }
    });
  }

  async addMember(clubId: string, dto: AddClubMemberDto) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');
    
    // Verify club and student belong to school
    const club = await this.prisma.club.findFirst({ where: { id: clubId, school_id: context.schoolId } });
    if (!club) throw new NotFoundException('Club not found');

    const student = await this.prisma.student.findFirst({ where: { id: dto.student_id, school_id: context.schoolId } });
    if (!student) throw new NotFoundException('Student not found');

    try {
      return await this.prisma.clubMember.create({
        data: {
          club_id: clubId,
          student_id: dto.student_id,
          role: dto.role || 'MEMBER'
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Student is already a member of this club');
      }
      throw error;
    }
  }

  async recordCompetition(clubId: string, data: { name: string, opponent?: string, venue: string, event_date: Date, result?: string }) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    return this.prisma.competition.create({
      data: { ...data, club_id: clubId, school_id: context.schoolId }
    });
  }

  async recordAchievement(data: { student_id?: string, club_id?: string, title: string, description?: string, evidence_url?: string, achieved_date: Date }) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    return this.prisma.achievement.create({
      data: { ...data, school_id: context.schoolId }
    });
  }
}