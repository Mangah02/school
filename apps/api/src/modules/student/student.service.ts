// apps/api/src/modules/student/students.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AdmitStudentDto } from './dto/admit-student.dto';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async admitStudent(dto: AdmitStudentDto) {
    const context = tenantStorage.getStore();
    if (!context?.schoolId) throw new BadRequestException('Tenant context missing');

    // 1. Generate Admission Number (Format: KMS_CODE/YYYY/####)
    // For simplicity, we use a sequential count + 1. In production, use a DB sequence or Redis INCR.
    const studentCount = await this.prisma.student.count({ where: { school_id: context.schoolId } });
    const school = await this.prisma.school.findUnique({ where: { id: context.schoolId } });
    const prefix = school?.kms_code || 'SCH';
    const year = new Date().getFullYear();
    const admissionNumber = `${prefix}/${year}/${String(studentCount + 1).padStart(4, '0')}`;

    // 2. Get active academic year
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { school_id: context.schoolId, is_active: true }
    });
    if (!activeYear) throw new BadRequestException('No active academic year found. Please complete onboarding.');

    // 3. Execute Admission in Transaction
    return this.prisma.$transaction(async (tx) => {
      // Create Student
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

      // Create Enrollment
      await tx.enrollment.create({
        data: {
          student_id: student.id,
          academic_year_id: activeYear.id,
          class_id: dto.academic.class_id,
        },
      });

      // Create Guardians and Link (Milestone 5.4)
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

      // 4. Queue Welcome SMS to Primary Guardian
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

    // 1. Fetch student and target class
    const student = await this.prisma.student.findFirst({
      where: { id: dto.student_id, school_id: context.schoolId, is_deleted: false },
      include: { enrollment: true }
    });
    if (!student) throw new NotFoundException('Student not found');

    const targetClass = await this.prisma.class.findFirst({
      where: { id: dto.new_class_id, school_id: context.schoolId }
    });
    if (!targetClass) throw new NotFoundException('Target class not found');

    // 2. R-01 Mitigation: Strict Curriculum Validation
    const studentCurr = dto.new_curriculum_type || student.curriculum_type;
    
    // CBC students cannot be placed in 844 classes (Form 1-4)
    if (studentCurr === 'CBC' && targetClass.curriculum_type === '844') {
      throw new BadRequestException('CBC students cannot be enrolled in 8-4-4 classes.');
    }
    // 844 students cannot be placed in CBC classes (Grade 1-12) unless explicitly transitioning
    if (studentCurr === '844' && targetClass.curriculum_type === 'CBC' && studentCurr !== 'TRANSITIONAL') {
      throw new BadRequestException('8-4-4 students cannot be enrolled in CBC classes without a TRANSITIONAL status.');
    }

    // 3. Execute Promotion in Transaction
    return this.prisma.$transaction(async (tx) => {
      // Archive old enrollment
      if (student.enrollment) {
        await tx.enrollment.update({
          where: { id: student.enrollment.id },
          data: { status: 'ARCHIVED' }
        });
      }

      // Create new enrollment
      const activeYear = await tx.academicYear.findFirst({
        where: { school_id: context.schoolId, is_active: true }
      });

      await tx.enrollment.create({
        data: {
          student_id: student.id,
          academic_year_id: activeYear.id,
          class_id: targetClass.id,
        },
      });

      // Update student record
      await tx.student.update({
        where: { id: student.id },
        data: {
          stream_id: dto.new_stream_id,
          curriculum_type: studentCurr,
        },
      });

      // Audit log the promotion reason
      await tx.auditLog.create({
        data: {
          school_id: context.schoolId,
          user_id: context.userId,
          action: 'PROMOTE',
          entity_type: 'Student',
          entity_id: student.id,
          new_values: { reason: dto.reason, new_class: targetClass.name },
          ip_address: 'SYSTEM', // Will be overridden by interceptor if available
        }
      });

      return { message: 'Student promoted successfully', new_class: targetClass.name };
    });
  }

  async findAll(query: { class_id?: string; stream_id?: string; search?: string }) {
    const context = tenantStorage.getStore();
    
    // Prisma Extension automatically injects school_id, but we add specific filters here
    return this.prisma.student.findMany({
      where: {
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
}