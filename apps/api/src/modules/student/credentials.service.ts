// apps/api/src/modules/student/credentials.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class CredentialsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('pdf-generation') private pdfQueue: Queue,
  ) {}

  async generateBulkCredentials(classId: string) {
    const context = tenantStorage.getStore();
    
    // Fetch students in the class
    const students = await this.prisma.student.findMany({
      where: { stream: { class_id: classId }, school_id: context.schoolId, is_deleted: false },
      include: { guardians: { include: { guardian: true } } }
    });

    const generatedSlips = [];

    for (const student of students) {
      // Find primary guardian for parent credentials
      const primaryGuardian = student.guardians.find(g => g.guardian.is_primary) || student.guardians[0]?.guardian;
      
      // Generate Student Credentials
      const studentTempPass = this.generateSecurePassword();
      await this.ensureUserAndSetPassword(student.id, student.email || `${student.admission_number}@student.smis`, studentTempPass, 'student');

      generatedSlips.push({
        type: 'STUDENT',
        name: `${student.first_name} ${student.last_name}`,
        admission_no: student.admission_number,
        username: student.admission_number,
        temp_password: studentTempPass,
      });

      // Generate Parent Credentials if guardian exists
      if (primaryGuardian) {
        const parentTempPass = this.generateSecurePassword();
        await this.ensureUserAndSetPassword(primaryGuardian.id, primaryGuardian.email || primaryGuardian.phone, parentTempPass, 'parent');

        generatedSlips.push({
          type: 'PARENT',
          name: `${primaryGuardian.first_name} ${primaryGuardian.last_name}`,
            relation: primaryGuardian.relationship,
          student_name: `${student.first_name} ${student.last_name}`,
          username: primaryGuardian.phone, // Phone is usually the username for parents
          temp_password: parentTempPass,
        });
      }
    }

    // Queue PDF generation (Milestone 6.2 will build the actual Puppeteer worker, we just dispatch here)
    const job = await this.pdfQueue.add('generate-credentials-pdf', {
      school_id: context.schoolId,
      slips: generatedSlips,
      requested_by: context.userId,
    });

    return { job_id: job.id, total_slips: generatedSlips.length };
  }

  private generateSecurePassword(): string {
    // 8 chars, uppercase, lowercase, number, symbol
    const upper = crypto.randomInt(65, 91); // A-Z
    const lower = crypto.randomInt(97, 123); // a-z
    const num = crypto.randomInt(48, 58); // 0-9
    const sym = crypto.randomInt(33, 48); // !- /
    const base = crypto.randomBytes(4).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
    return String.fromCharCode(upper, lower, num, sym) + base;
  }

  private async ensureUserAndSetPassword(entityId: string, email: string, password: string, role: string) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 12);

    // Upsert user record, forcing must_change_password = true
    await this.prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: { 
        password_hash: hash, 
        must_change_password: true,
        is_deleted: false 
      },
      create: {
        email: email.toLowerCase(),
        password_hash: hash,
        role_id: role, // Simplified for example, normally fetches Role ID
        must_change_password: true,
        // school_id and other fields mapped from context
      }
    });
  }
}