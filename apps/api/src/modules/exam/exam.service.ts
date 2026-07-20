// apps/api/src/modules/exam/exam.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EnterMarksDto } from './dto/enter-marks.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class ExamService {
  constructor(private prisma: PrismaService) {}

  async enterMarks(dto: EnterMarksDto, userId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');
    
    // 1. Verify Exam exists and is not locked
    const exam = await this.prisma.exam.findFirst({
      where: { id: dto.exam_id, school_id: context.schoolId }
    });
    if (!exam) throw new NotFoundException('Exam not found');
    if (exam.is_locked) throw new ForbiddenException('Exam marks are locked and cannot be edited');

    // 2. Fetch student's curriculum type to determine grading logic (R-01 Mitigation)
    const studentIds = dto.marks.map(m => m.student_id);
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds }, school_id: context.schoolId },
      select: { id: true, curriculum_type: true }
    });

    const studentMap = new Map(students.map(s => [s.id, s.curriculum_type]));

    // 3. Process marks in a transaction
    return this.prisma.$transaction(async (tx) => {
      const operations = dto.marks.map(mark => {
        const curriculum = studentMap.get(mark.student_id);
        const isCBC = curriculum === 'CBC' || curriculum === 'TRANSITIONAL';

        // Calculate Grade / CBC Rating
        let grade: string | null = null;
        let remarks: string | null = null;
        let cbc_rating: string | null = null;

        const percentage = (mark.marks_obtained / mark.max_marks) * 100;

        if (isCBC) {
          // SRS 11.5: CBC Competency Ratings
          if (percentage >= 80) cbc_rating = 'EXCEEDING';
          else if (percentage >= 65) cbc_rating = 'MEETING';
          else if (percentage >= 50) cbc_rating = 'APPROACHING';
          else cbc_rating = 'BELOW';
        } else {
          // Standard 8-4-4 Grading Scale
          if (percentage >= 80) { grade = 'A'; remarks = 'Excellent'; }
          else if (percentage >= 65) { grade = 'B'; remarks = 'Very Good'; }
          else if (percentage >= 50) { grade = 'C'; remarks = 'Good'; }
          else if (percentage >= 40) { grade = 'D'; remarks = 'Fair'; }
          else { grade = 'E'; remarks = 'Fail'; }
        }

        return tx.examResult.upsert({
          where: {
            exam_id_student_id_subject_id: {
              exam_id: dto.exam_id,
              student_id: mark.student_id,
              subject_id: mark.subject_id,
            }
          },
          update: {
            marks_obtained: mark.marks_obtained,
            max_marks: mark.max_marks,
            grade,
            remarks,
            is_cbc_assessment: isCBC,
            cbc_rating,
          },
          create: {
            exam_id: dto.exam_id,
            student_id: mark.student_id,
            subject_id: mark.subject_id,
            marks_obtained: mark.marks_obtained,
            max_marks: mark.max_marks,
            grade,
            remarks,
            is_cbc_assessment: isCBC,
            cbc_rating,
          }
        });
      });

      // ✅ FIX: Use Promise.all to execute the array of promises within the transaction
      return Promise.all(operations);
    });
  }

  async lockExam(examId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    return this.prisma.exam.update({
      where: { id: examId, school_id: context.schoolId },
      data: { is_locked: true }
    });
  }
}