// apps/api/src/modules/academic/academic.service.ts
import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

  async createSubject(dto: CreateSubjectDto) {
    const context = tenantStorage.getStore();
    if (!context?.schoolId) throw new BadRequestException('Tenant context missing');

    return this.prisma.subject.create({
      data: {
        school_id: context.schoolId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        is_cbc: dto.is_cbc || false,
      },
    });
  }

  async assignSubjectToClass(dto: AssignSubjectDto) {
    const context = tenantStorage.getStore();
    
    // Verify class and subject belong to this school
    const [classRecord, subjectRecord] = await Promise.all([
      this.prisma.class.findFirst({ where: { id: dto.class_id, school_id: context.schoolId } }),
      this.prisma.subject.findFirst({ where: { id: dto.subject_id, school_id: context.schoolId } }),
    ]);

    if (!classRecord || !subjectRecord) throw new BadRequestException('Class or Subject not found in this school');

    // R-01 Mitigation: Prevent assigning CBC subjects to 844 classes and vice versa
    if (subjectRecord.is_cbc && classRecord.curriculum_type === '844') {
      throw new BadRequestException('Cannot assign a CBC learning area to an 8-4-4 class');
    }
    if (!subjectRecord.is_cbc && classRecord.curriculum_type === 'CBC') {
      // Allow standard subjects in CBC (e.g., English, Math), but flag if strict separation is needed
    }

    return this.prisma.classSubject.upsert({
      where: {
        class_id_subject_id: { class_id: dto.class_id, subject_id: dto.subject_id },
      },
      update: {
        is_compulsory: dto.is_compulsory ?? true,
        teacher_id: dto.teacher_id,
      },
      create: {
        class_id: dto.class_id,
        subject_id: dto.subject_id,
        is_compulsory: dto.is_compulsory ?? true,
        teacher_id: dto.teacher_id,
      },
    });
  }

  async getSubjectsForClass(classId: string) {
    const context = tenantStorage.getStore();
    return this.prisma.classSubject.findMany({
      where: { class_id: classId, class: { school_id: context.schoolId } },
      include: { subject: true },
    });
  }
}