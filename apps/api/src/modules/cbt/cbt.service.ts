// apps/api/src/modules/cbt/cbt.service.ts
import { Injectable, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';
import * as Bull from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class CbtService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('ai-grading') private aiGradingQueue: Bull.Queue,
  ) {}

  async startExam(examId: string, studentId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');
    
    const exam = await this.prisma.cBTExam.findFirst({
      where: { id: examId, school_id: context.schoolId, is_active: true }
    });
    if (!exam) throw new BadRequestException('Exam not found or inactive');

    const now = new Date();
    if (now < exam.start_time) throw new ForbiddenException('Exam has not started yet');
    
    // REQ-CBT-010: Allow resume if session exists and is ACTIVE
    let session = await this.prisma.cBTSession.findUnique({
      where: { exam_id_student_id: { exam_id: examId, student_id: studentId } }
    });

    if (!session) {
      session = await this.prisma.cBTSession.create({
        data: {
          exam_id: examId,
          student_id: studentId,
          start_time: now,
          status: 'ACTIVE'
        }
      });
    } else if (session.status !== 'ACTIVE') {
      throw new ForbiddenException('Exam session is already submitted or timed out');
    }

    return { session_id: session.id, exam, server_time: now };
  }

  /**
   * REQ-CBT-004: Non-blocking async write for auto-save every 60s or on change.
   */
  async saveAnswer(sessionId: string, questionId: string, studentAnswer: string, clientUpdatedAt: Date) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');
    
    // Verify session belongs to this school and is ACTIVE
    const session = await this.prisma.cBTSession.findFirst({
      where: { id: sessionId, exam: { school_id: context.schoolId }, status: 'ACTIVE' }
    });
    if (!session) throw new ForbiddenException('Invalid or inactive session');

    // REQ-CBT-011: Check if 10 mins have passed since exam end_time
    const exam = await this.prisma.cBTExam.findUnique({ where: { id: session.exam_id } });
    
    // ✅ FIX: Check if exam is null before accessing end_time
    if (!exam) throw new BadRequestException('Exam not found for this session');
    
    const timeSinceEnd = Date.now() - exam.end_time.getTime();
    if (timeSinceEnd > 10 * 60 * 1000) {
      await this.forceSubmitExam(sessionId);
      throw new ForbiddenException('Session expired. Exam auto-submitted.');
    }

    return this.prisma.cBTAnswer.upsert({
      where: { session_id_question_id: { session_id: sessionId, question_id: questionId } },
      update: {
        student_answer: studentAnswer,
        client_updated_at: clientUpdatedAt,
        server_updated_at: new Date(),
      },
      create: {
        session_id: sessionId,
        question_id: questionId,
        student_answer: studentAnswer,
        client_updated_at: clientUpdatedAt,
        server_updated_at: new Date(),
      }
    });
  }

  /**
   * REQ-CBT-008: Server-side timer enforcement. Auto-submits at end time.
   */
  async submitExam(sessionId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');
    
    const session = await this.prisma.cBTSession.findFirst({
      where: { id: sessionId, exam: { school_id: context.schoolId } },
      include: { answers: { include: { question: true } }, exam: true }
    });
    if (!session) throw new BadRequestException('Session not found');
    if (session.status !== 'ACTIVE') return { status: session.status, message: 'Already processed' };

    // REQ-CBT-008: Enforce server-side end time
    const now = new Date();
    const isTimeout = now > session.exam.end_time;
    
    await this.prisma.cBTSession.update({
      where: { id: sessionId },
      data: { 
        end_time: now, 
        status: isTimeout ? 'TIMEOUT' : 'SUBMITTED' 
      }
    });

    // Queue auto-grading for MCQ and AI grading for Essays
    await this.aiGradingQueue.add('grade-cbt-session', {
      session_id: sessionId,
      school_id: context.schoolId,
      answers: session.answers.map(a => ({
        question_id: a.question_id,
        student_answer: a.student_answer,
        question_type: a.question.question_type,
        correct_answer: a.question.correct_answer,
        rubric: a.question.rubric,
        marks: a.question.marks
      }))
    });

    return { status: isTimeout ? 'TIMEOUT' : 'SUBMITTED', message: 'Exam submitted successfully' };
  }

  /**
   * REQ-CBT-006/012: Log proctoring anomalies (tab switch, copy-paste).
   */
  async logProctoringEvent(sessionId: string, eventType: string, details: any) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');
    
    const session = await this.prisma.cBTSession.findFirst({
      where: { id: sessionId, exam: { school_id: context.schoolId } }
    });
    if (!session) return; // Fail silently to not disrupt student exam flow

    return this.prisma.cBTProctoringLog.create({
      data: {
        session_id: sessionId,
        event_type: eventType,
        details: details || {}
      }
    });
  }

  private async forceSubmitExam(sessionId: string) {
    await this.prisma.cBTSession.update({
      where: { id: sessionId },
      data: { end_time: new Date(), status: 'TIMEOUT' }
    });
    // Trigger grading queue here as well
  }
}