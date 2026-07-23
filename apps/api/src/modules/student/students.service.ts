// apps/api/src/modules/student/students.service.ts
import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AdmitStudentDto } from './dto/admit-student.dto';
import { PromoteStudentDto } from './dto/promote-student.dto';
import * as Bull from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Bull.Queue,
  ) {}

  async createStudent(data: any, schoolId: string) {
    if (!schoolId) {
      throw new BadRequestException('School ID missing from authentication token');
    }

    return this.prisma.student.create({
      data: {
        school_id: schoolId,
        admission_number: data.admission_number,
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: new Date(data.date_of_birth),
        gender: data.gender,
        nationality: data.nationality || 'Kenyan',
        curriculum_type: 'CBC',
        status: 'ACTIVE',
        is_deleted: false,
      },
    });
  }

  async findOne(id: string, schoolId: string) {
    if (!schoolId) {
      throw new BadRequestException('School ID missing from authentication token');
    }

    const student = await this.prisma.student.findFirst({
      where: { id, school_id: schoolId, is_deleted: false },
      include: {
        stream: { include: { class: true } },
        enrollment: { include: { academic_year: true, class: true } },
        guardians: { 
          include: { 
            guardian: true 
          } 
        },
        medicalRecord: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found or does not belong to this school');
    }

    return student;
  }

  async updateStudent(id: string, data: any, schoolId: string) {
    if (!schoolId) {
      throw new BadRequestException('School ID missing from authentication token');
    }

    const existing = await this.prisma.student.findFirst({
      where: { id, school_id: schoolId, is_deleted: false }
    });

    if (!existing) {
      throw new NotFoundException('Student not found or does not belong to this school');
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        admission_number: data.admission_number,
        date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
        gender: data.gender,
        nationality: data.nationality,
      },
    });
  }

  async linkGuardian(studentId: string, guardianId: string, schoolId: string) {
    if (!schoolId) {
      throw new BadRequestException('School ID missing from authentication token');
    }

    // 1. Verify student belongs to school
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, school_id: schoolId, is_deleted: false }
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // 2. Verify guardian belongs to school
    const guardian = await this.prisma.guardian.findFirst({
      where: { id: guardianId, school_id: schoolId, is_deleted: false }
    });
    if (!guardian) {
      throw new NotFoundException('Guardian not found');
    }

    // 3. Check if already linked
    const existingLink = await this.prisma.guardianStudent.findFirst({
      where: { student_id: studentId, guardian_id: guardianId }
    });
    if (existingLink) {
      throw new BadRequestException('Guardian is already linked to this student');
    }

    // 4. Create the link
    return this.prisma.guardianStudent.create({
      data: {
        student_id: studentId,
        guardian_id: guardianId,
      },
      include: {
        guardian: true,
      },
    });
  }

  async admitStudent(dto: AdmitStudentDto) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    const studentCount = await this.prisma.student.count({ where: { school_id: context.schoolId } });
    const school = await this.prisma.school.findUnique({ where: { id: context.schoolId } });
    
    if (!school) throw new BadRequestException('School not found');
    
    const prefix = school.kms_code || 'SCH';
    const year = new Date().getFullYear();
    const admissionNumber = `${prefix}/${year}/${String(studentCount + 1).padStart(4, '0')}`;

    const activeYear = await this.prisma.academicYear.findFirst({
      where: { school_id: context.schoolId, is_active: true }
    });
    if (!activeYear) throw new BadRequestException('No active academic year found. Please complete onboarding.');

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          school_id: context.schoolId,
          admission_number: admissionNumber,
          first_name: dto.personal.first_name,
          middle_name: dto.personal.middle_name,
          last_name: dto.personal.last_name,
          date_of_birth: new Date(dto.personal.date_of_birth),
          gender: dto.personal.gender,
          nationality: dto.personal.nationality,
          blood_group: dto.personal.blood_group,
          medical_condition: dto.personal.medical_condition,
          photo_url: dto.personal.photo_url,
          curriculum_type: dto.academic.curriculum_type || 'CBC',
          stream_id: dto.academic.stream_id,
        },
      });

      await tx.enrollment.create({
        data: {
          student_id: student.id,
          academic_year_id: activeYear.id,
          class_id: dto.academic.class_id,
        },
      });

      for (const g of dto.guardians) {
        const guardian = await tx.guardian.create({
          data: {
            school_id: context.schoolId,
            first_name: g.first_name,
            last_name: g.last_name,
            phone: g.phone,
            email: g.email,
            relationship: g.relationship,
            is_primary: g.is_primary || false,
          },
        });

        await tx.guardianStudent.create({
          data: { guardian_id: guardian.id, student_id: student.id },
        });
      }

      const primaryGuardian = dto.guardians.find(g => g.is_primary) || dto.guardians[0];
      if (primaryGuardian) {
        await this.notificationsQueue.add('send-sms', {
          to: primaryGuardian.phone,
          message: `Welcome to ${school.name}! ${student.first_name} has been admitted. Admission No: ${admissionNumber}.`,
        });
      }

      return student;
    });
  }

  async promoteStudent(dto: PromoteStudentDto) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    const student = await this.prisma.student.findFirst({
      where: { id: dto.student_id, school_id: context.schoolId, is_deleted: false },
      include: { enrollment: true }
    });
    if (!student) throw new NotFoundException('Student not found');

    const targetClass = await this.prisma.class.findFirst({
      where: { id: dto.new_class_id, school_id: context.schoolId }
    });
    if (!targetClass) throw new NotFoundException('Target class not found');

    const studentCurr = dto.new_curriculum_type || student.curriculum_type;
    
    if (studentCurr === 'CBC' && targetClass.curriculum_type === '844') {
      throw new BadRequestException('CBC students cannot be enrolled in 8-4-4 classes.');
    }
    if (studentCurr === '844' && targetClass.curriculum_type === 'CBC' && dto.new_curriculum_type !== 'TRANSITIONAL') {
      throw new BadRequestException('8-4-4 students cannot be enrolled in CBC classes without a TRANSITIONAL status.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (student.enrollment) {
        await tx.enrollment.update({
          where: { id: student.enrollment.id },
          data: { status: 'ARCHIVED' }
        });
      }

      const activeYear = await tx.academicYear.findFirst({
        where: { school_id: context.schoolId, is_active: true }
      });
      
      if (!activeYear) throw new BadRequestException('No active academic year found');

      await tx.enrollment.create({
        data: {
          student_id: student.id,
          academic_year_id: activeYear.id,
          class_id: targetClass.id,
        },
      });

      await tx.student.update({
        where: { id: student.id },
        data: {
          stream_id: dto.new_stream_id,
          curriculum_type: studentCurr,
        },
      });

      await tx.auditLog.create({
        data: {
          school_id: context.schoolId,
          user_id: context.userId,
          action: 'PROMOTE',
          entity_type: 'Student',
          entity_id: student.id,
          new_values: { reason: dto.reason, new_class: targetClass.name },
          ip_address: 'SYSTEM',
        }
      });

      return { message: 'Student promoted successfully', new_class: targetClass.name };
    });
  }

  async findAll(query: { class_id?: string; stream_id?: string; search?: string }, providedSchoolId?: string) {
    const context = tenantStorage.getStore();
    const schoolId = providedSchoolId || context?.schoolId;

    if (!schoolId) {
      throw new UnauthorizedException('Tenant context missing: No school_id provided');
    }
    
    return this.prisma.student.findMany({
      where: {
        school_id: schoolId,
        is_deleted: false,
        stream_id: query.stream_id,
        stream: { class_id: query.class_id },
        OR: query.search ? [
          { first_name: { contains: query.search, mode: 'insensitive' } },
          { last_name: { contains: query.search, mode: 'insensitive' } },
          { admission_number: { contains: query.search, mode: 'insensitive' } },
        ] : undefined,
      },
      include: { stream: { include: { class: true } }, guardians: { include: { guardian: true } } },
      orderBy: { admission_number: 'asc' },
    });
  }

  async getUnenrolledStudents(schoolId: string) {
    return this.prisma.student.findMany({
      where: {
        school_id: schoolId,
        is_deleted: false,
        OR: [
          { enrollment: { is: null } },
          { enrollment: { status: { not: 'ACTIVE' } } }
        ]
      },
      include: { 
        stream: true,
        enrollment: true 
      },
      orderBy: { admission_number: 'asc' },
    });
  }
}