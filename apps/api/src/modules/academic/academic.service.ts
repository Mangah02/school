// apps/api/src/modules/academic/academic.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // ACADEMIC YEARS (NEW)
  // ==========================================
  async getAcademicYears(schoolId: string) {
    return this.prisma.academicYear.findMany({
      where: { school_id: schoolId },
      orderBy: { start_date: 'desc' },
    });
  }

  async createAcademicYear(schoolId: string, data: any) {
    if (!data.name || !data.start_date || !data.end_date) {
      throw new BadRequestException('Name, start date, and end date are required');
    }

    return this.prisma.$transaction(async (tx) => {
      // If setting as active, deactivate all other years first
      if (data.is_active) {
        await tx.academicYear.updateMany({
          where: { school_id: schoolId, is_active: true },
          data: { is_active: false },
        });
      }

      return tx.academicYear.create({
        data: {
          school_id: schoolId,
          name: data.name,
          start_date: new Date(data.start_date),
          end_date: new Date(data.end_date),
          is_active: data.is_active || false,
        },
      });
    });
  }

  async updateAcademicYear(schoolId: string, id: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      // If activating this year, deactivate all others
      if (data.is_active === true) {
        await tx.academicYear.updateMany({
          where: { school_id: schoolId, is_active: true, id: { not: id } },
          data: { is_active: false },
        });
      }

      return tx.academicYear.update({
        where: { id, school_id: schoolId },
        data: {
          name: data.name,
          start_date: data.start_date ? new Date(data.start_date) : undefined,
          end_date: data.end_date ? new Date(data.end_date) : undefined,
          is_active: data.is_active,
        },
      });
    });
  }

  // ==========================================
  // CLASSES & STREAMS
  // ==========================================
  async getClasses(schoolId: string) {
    return this.prisma.class.findMany({
      where: { school_id: schoolId },
      include: { streams: true },
      orderBy: { level: 'asc' },
    });
  }

  async createClass(schoolId: string, data: any) {
    if (!schoolId) throw new BadRequestException('School ID is missing');
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestException('Class name is required');
    }
    if (data.level === undefined || data.level === null || data.level === '') {
      throw new BadRequestException('Class level is required');
    }

    const existing = await this.prisma.class.findFirst({
      where: { school_id: schoolId, name: data.name.trim() },
    });
    if (existing) throw new BadRequestException('Class name already exists');

    return this.prisma.$transaction(async (tx) => {
      const newClass = await tx.class.create({
        data: {
          school_id: schoolId,
          name: data.name.trim(),
          level: Number(data.level),
          curriculum_type: 'CBC',
        },
      });

      if (data.streams && data.streams.length > 0) {
        await tx.stream.createMany({
          data: data.streams.map((s: any) => ({
            class_id: newClass.id,
            name: s.name.trim(),
            capacity: s.capacity || 40,
          })),
        });
      }

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

    if (!existingClass) throw new NotFoundException('Class not found');
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestException('Class name is required');
    }
    if (data.level === undefined || data.level === null || data.level === '') {
      throw new BadRequestException('Class level is required');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.class.update({
        where: { id: classId },
        data: { name: data.name.trim(), level: Number(data.level) },
      });

      const existingStreams = await tx.stream.findMany({ where: { class_id: classId } });
      const newStreamData = data.streams || [];
      const newStreamNames = newStreamData.map((s: any) => s.name.trim().toLowerCase());

      const streamsToDelete = existingStreams.filter(
        (es) => !newStreamNames.includes(es.name.trim().toLowerCase())
      );

      for (const stream of streamsToDelete) {
        const studentCount = await tx.student.count({ where: { stream_id: stream.id } });
        if (studentCount > 0) {
          throw new BadRequestException(`Cannot remove stream "${stream.name}" because it has ${studentCount} enrolled student(s).`);
        }
      }

      if (streamsToDelete.length > 0) {
        await tx.stream.deleteMany({
          where: { class_id: classId, name: { in: streamsToDelete.map((s) => s.name) } },
        });
      }

      const existingStreamNames = existingStreams.map((es) => es.name.trim().toLowerCase());
      const streamsToCreate = newStreamData.filter(
        (s: any) => !existingStreamNames.includes(s.name.trim().toLowerCase())
      );

      if (streamsToCreate.length > 0) {
        await tx.stream.createMany({
          data: streamsToCreate.map((s: any) => ({
            class_id: classId,
            name: s.name.trim(),
            capacity: s.capacity || 40,
          })),
        });
      }

      return tx.class.findUnique({ where: { id: classId }, include: { streams: true } });
    });
  }

  // ==========================================
  // ENROLLMENTS
  // ==========================================
  async enrollStudent(studentId: string, streamId: string, schoolId: string) {
    if (!schoolId) throw new BadRequestException('School ID is missing');

    const stream = await this.prisma.stream.findFirst({
      where: { id: streamId, class: { school_id: schoolId } },
      include: { class: true }
    });
    if (!stream) {
      throw new NotFoundException('Stream not found or does not belong to this school');
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, school_id: schoolId, is_deleted: false },
      include: { enrollment: true }
    });
    if (!student) {
      throw new NotFoundException('Student not found or does not belong to this school');
    }

    if (student.enrollment && student.enrollment.status === 'ACTIVE') {
      throw new BadRequestException('Student is already actively enrolled');
    }

    // 3. Get active academic year
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { school_id: schoolId, is_active: true }
    });
    if (!activeYear) {
      throw new BadRequestException('No active academic year found. Please configure one first.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: studentId },
        data: { stream_id: streamId }
      });

      if (student.enrollment) {
        return tx.enrollment.update({
          where: { student_id: studentId },
          data: {
            academic_year_id: activeYear.id,
            class_id: stream.class_id,
            status: 'ACTIVE',
            admission_date: new Date(),
          },
          include: { academic_year: true, class: true, student: true }
        });
      } else {
        return tx.enrollment.create({
          data: {
            student_id: studentId,
            academic_year_id: activeYear.id,
            class_id: stream.class_id,
            status: 'ACTIVE',
            admission_date: new Date(),
          },
          include: { academic_year: true, class: true, student: true }
        });
      }
    });
  }

  // ==========================================
  // SUBJECTS
  // ==========================================
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
    if (existing) throw new BadRequestException('Subject code already exists');

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
    if (!existing) throw new NotFoundException('Subject not found');

    return this.prisma.subject.update({
      where: { id: subjectId },
      data: { name: data.name, code: data.code, is_cbc: data.is_cbc, is_active: data.is_active },
    });
  }

  async deleteSubject(schoolId: string, subjectId: string) {
    return this.prisma.subject.update({
      where: { id: subjectId, school_id: schoolId },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }

  // ==========================================
  // TIMETABLES
  // ==========================================
  async getTimetable(schoolId: string, streamId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { school_id: schoolId, stream_id: streamId },
      include: { subject: true, staff: true },
      orderBy: [{ day: 'asc' }, { start_time: 'asc' }],
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
        staff_id: data.staff_id,
      },
      include: { subject: true, staff: true },
    });
  }

  async updateTimetableSlot(schoolId: string, slotId: string, data: any) {
    return this.prisma.timetableSlot.update({
      where: { id: slotId, school_id: schoolId },
      data: { subject_id: data.subject_id, staff_id: data.staff_id },
      include: { subject: true, staff: true },
    });
  }
}