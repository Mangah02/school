// apps/api/src/modules/student/credentials.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'; // ✅ Added UnauthorizedException
import { PrismaService } from '../../core/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull'; // ✅ FIX: Namespace import for Bull
import * as crypto from 'crypto';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class CredentialsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('pdf-generation') private pdfQueue: Bull.Queue, // ✅ FIX: Use Bull.Queue
  ) {}

  async generateBulkCredentials(classId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard
    
    // Fetch students in the class
    const students = await this.prisma.student.findMany({
      where: { stream: { class_id: classId }, school_id: context.schoolId, is_deleted: false },
      include: { guardians: { include: { guardian: true } } }
    });

    // ✅ FIX: Explicitly type array to prevent 'never[]' inference
    const generatedSlips: any[] = [];

    for (const student of students) {
      // ✅ FIX: Correctly extract the guardian object, not the wrapper
      const primaryGuardian = student.guardians.find(g => g.guardian.is_primary)?.guardian || student.guardians[0]?.guardian;
      
      // Generate Student Credentials
      const studentTempPass = this.generateSecurePassword();
      // ✅ FIX: Removed student.email as it doesn't exist on the Student model
      const studentUsername = `${student.admission_number}@student.smis`;
      await this.ensureUserAndSetPassword(student.id, studentUsername, studentTempPass, 'student', context.schoolId);

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
        const parentUsername = primaryGuardian.email || primaryGuardian.phone;
        
        await this.ensureUserAndSetPassword(primaryGuardian.id, parentUsername, parentTempPass, 'parent', context.schoolId);

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

  // ✅ FIX: Added schoolId parameter and changed upsert to findFirst + update/create
  private async ensureUserAndSetPassword(entityId: string, usernameOrEmail: string, password: string, role: string, schoolId: string) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 12);
    const lowerUsername = usernameOrEmail.toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { email: lowerUsername }
    });

    if (existingUser) {
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          password_hash: hash, 
          must_change_password: true,
          is_deleted: false 
        }
      });
    } else {
      await this.prisma.user.create({
        data: {
          email: lowerUsername,
          password_hash: hash,
          role_id: role, 
          school_id: schoolId,
          must_change_password: true,
        }
      });
    }
  }
}