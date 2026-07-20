// apps/api/src/modules/report/report.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'; // ✅ Added UnauthorizedException
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull'; // ✅ FIX: Namespace import for Bull
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('pdf-generation') private pdfQueue: Bull.Queue, // ✅ FIX: Use Bull.Queue
  ) {}

  async generateClassReportCards(examId: string, classId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    // 1. Fetch all students in the class and their results for this exam
    const students = await this.prisma.student.findMany({
      where: { 
        stream: { class_id: classId }, 
        school_id: context.schoolId, 
        is_deleted: false 
      },
      include: {
        examResults: {
          where: { exam_id: examId },
          include: { subject: true }
        }
      }
    });

    // 2. Chunk students to prevent massive payload in Redis queue
    // We create one job per student to allow parallel processing (concurrency 10)
    const jobs = students.map(student => {
      return this.pdfQueue.add('generate-report-card', {
        school_id: context.schoolId,
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        exam_id: examId,
        results: student.examResults,
        requested_by: context.userId,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
    });

    const addedJobs = await Promise.all(jobs);
    
    return { 
      success: true, 
      message: `${addedJobs.length} report cards queued for generation`,
      job_count: addedJobs.length 
    };
  }
}