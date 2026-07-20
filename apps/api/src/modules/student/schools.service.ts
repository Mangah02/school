// apps/api/src/modules/student/schools.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import * as bcrypt from 'bcrypt';
import * as Bull from 'bull'; // ✅ FIX: Namespace import for Bull
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class SchoolsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Bull.Queue, // ✅ FIX: Use Bull.Queue
  ) {}

  async provisionSchool(dto: CreateSchoolDto) {
    // Check if school or admin email already exists
    const existingSchool = await this.prisma.school.findUnique({ where: { kms_code: dto.kms_code } });
    if (existingSchool) throw new ConflictException('School with this KMS code already exists');

    // Use a transaction to ensure atomic provisioning
    return this.prisma.$transaction(async (tx) => {
      // 1. Create School
      const school = await tx.school.create({
        data: { name: dto.name, kms_code: dto.kms_code, curriculum_type: dto.curriculum_type },
      });

      // 2. Create Default Academic Structure (Current Year)
      const currentYear = new Date().getFullYear();
      const academicYear = await tx.academicYear.create({
        data: {
          school_id: school.id,
          name: `${currentYear}/${currentYear + 1}`,
          start_date: new Date(`${currentYear}-01-01`),
          end_date: new Date(`${currentYear + 1}-12-31`),
          is_active: true,
        },
      });

      // Create 3 Terms
      await tx.term.createMany({
        data: [
          { academic_year_id: academicYear.id, name: 'Term 1', start_date: new Date(`${currentYear}-01-01`), end_date: new Date(`${currentYear}-04-30`), is_active: true },
          { academic_year_id: academicYear.id, name: 'Term 2', start_date: new Date(`${currentYear}-05-01`), end_date: new Date(`${currentYear}-08-31`) },
          { academic_year_id: academicYear.id, name: 'Term 3', start_date: new Date(`${currentYear}-09-01`), end_date: new Date(`${currentYear}-12-31`) },
        ],
      });

      // 3. Create Default Classes (CBC Structure)
      const cbcClasses = ['Playgroup', 'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
      const classesData = cbcClasses.map((name, index) => ({
        school_id: school.id,
        name,
        level: index + 1,
      }));
      await tx.class.createMany({ data: classesData });

      // 4. Create School Admin User
      const defaultRole = await tx.role.findUnique({ where: { name: 'school_admin' } });
      if (!defaultRole) throw new Error('System configuration error: school_admin role missing');

      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'; // Generate temp password
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const adminUser = await tx.user.create({
        data: {
          school_id: school.id,
          email: dto.admin_email.toLowerCase(),
          password_hash: passwordHash,
          role_id: defaultRole.id,
          // ✅ FIX: Removed first_name and last_name as they do not exist on the User model in your Prisma schema
        },
      });

      // 5. Queue Welcome Email with credentials
      await this.notificationsQueue.add('send-email', {
        type: 'school_provisioned',
        to: dto.admin_email,
        data: { schoolName: dto.name, tempPassword, adminEmail: dto.admin_email },
      });

      return { school, adminEmail: dto.admin_email, tempPassword };
    });
  }
}