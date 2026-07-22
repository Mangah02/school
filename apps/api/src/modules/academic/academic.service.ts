// apps/api/src/modules/academic/academic.service.ts
/*import { Injectable, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common'; // ✅ Added UnauthorizedException
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
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard
    
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
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    return this.prisma.classSubject.findMany({
      where: { class_id: classId, class: { school_id: context.schoolId } },
      include: { subject: true },
    });
  }
}
*/

// apps/api/src/modules/academic/academic.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

  async getClasses(schoolId: string) {
    return this.prisma.class.findMany({
      where: { school_id: schoolId },
      include: {
        streams: true,
      },
      orderBy: { level: 'asc' },
    });
  }

  async createClass(schoolId: string, data: any) {
    // Check if class name already exists for this school
    const existing = await this.prisma.class.findFirst({
      where: { school_id: schoolId, name: data.name },
    });
    if (existing) {
      throw new BadRequestException('Class name already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the Class
      const newClass = await tx.class.create({
        data: {
          school_id: schoolId,
          name: data.name,
          level: data.level,
          curriculum_type: 'CBC', // Default fallback
        },
      });

      // 2. Create associated Streams
      if (data.streams && data.streams.length > 0) {
        await tx.stream.createMany({
          data: data.streams.map((s: any) => ({
            class_id: newClass.id,
            name: s.name,
            capacity: s.capacity || 40,
          })),
        });
      }

      // 3. Return the newly created class with streams
      return tx.class.findUnique({
        where: { id: newClass.id },
        include: { streams: true },
      });
    });
  }

  async updateClass(schoolId: string, classId: string, data: any) {
    const existingClass = await this.prisma.class.findFirst({
      where: { id: classId, school_id: schoolId },
    });

    if (!existingClass) {
      throw new NotFoundException('Class not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update class details
      await tx.class.update({
        where: { id: classId },
        data: {
          name: data.name,
          level: data.level,
        },
      });

      // 2. Replace streams (delete old, create new based on payload)
      await tx.stream.deleteMany({
        where: { class_id: classId },
      });

      if (data.streams && data.streams.length > 0) {
        await tx.stream.createMany({
          data: data.streams.map((s: any) => ({
            class_id: classId,
            name: s.name,
            capacity: s.capacity || 40,
          })),
        });
      }

      // 3. Return updated class with streams
      return tx.class.findUnique({
        where: { id: classId },
        include: { streams: true },
      });
    });
  }
  // ... (keep your existing Class methods above)

  async getSubjects(schoolId: string) {
    return this.prisma.subject.findMany({
      where: { school_id: schoolId, is_deleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async createSubject(schoolId: string, data: any) {
    const existing = await this.prisma.subject.findFirst({
      where: { school_id: schoolId, code: data.code },
    });
    if (existing) {
      throw new BadRequestException('Subject code already exists');
    }

    return this.prisma.subject.create({
      data: {
        school_id: schoolId,
        name: data.name,
        code: data.code,
        is_cbc: data.is_cbc || false,
        is_active: true,
      },
    });
  }

  async updateSubject(schoolId: string, subjectId: string, data: any) {
    const existing = await this.prisma.subject.findFirst({
      where: { id: subjectId, school_id: schoolId },
    });
    if (!existing) {
      throw new NotFoundException('Subject not found');
    }

    return this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: data.name,
        code: data.code,
        is_cbc: data.is_cbc,
        is_active: data.is_active,
      },
    });
  }

  async deleteSubject(schoolId: string, subjectId: string) {
    // Soft delete to preserve historical data
    return this.prisma.subject.update({
      where: { id: subjectId, school_id: schoolId },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }
    // --- TIMETABLE METHODS ---
  async getTimetable(schoolId: string, streamId: string) {
    return this.prisma.timetableSlot.findMany({
      where: {
        school_id: schoolId,
        stream_id: streamId,
      },
      include: {
        subject: true,
        staff: true, // ✅ MUST BE 'staff', NOT 'teacher'
      },
      orderBy: [
        { day: 'asc' },
        { start_time: 'asc' },
      ],
    });
  }

  async createTimetableSlot(schoolId: string, data: any) {
    return this.prisma.timetableSlot.create({
      data: {
        school_id: schoolId,
        stream_id: data.stream_id,
        day: data.day,
        start_time: data.start_time,
        end_time: data.end_time,
        subject_id: data.subject_id,
        staff_id: data.staff_id, // ✅ MUST BE 'staff_id'
      },
      include: {
        subject: true,
        staff: true, // ✅ MUST BE 'staff'
      },
    });
  }

  async updateTimetableSlot(schoolId: string, slotId: string, data: any) {
    return this.prisma.timetableSlot.update({
      where: {
        id: slotId,
        school_id: schoolId,
      },
      data: {
        subject_id: data.subject_id,
        staff_id: data.staff_id, // ✅ MUST BE 'staff_id'
      },
      include: {
        subject: true,
        staff: true, // ✅ MUST BE 'staff'
      },
    });
  }



}