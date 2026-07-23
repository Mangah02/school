// apps/api/src/modules/public/public.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async createApplication(data: any) {
    if (!data.school_id) {
      throw new BadRequestException('School ID is required');
    }

    // Generate a temporary admission number for the application
    const year = new Date().getFullYear();
    const count = await this.prisma.student.count({ where: { school_id: data.school_id } });
    const tempAdmissionNumber = `APP/${year}/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the Guardian
      const guardian = await tx.guardian.create({
        data: {
          school_id: data.school_id,
          first_name: data.parent_first_name,
          last_name: data.parent_last_name,
          phone: data.parent_phone,
          email: data.parent_email,
          relationship: data.parent_relationship,
          is_primary: true,
        },
      });

      // 2. Create the Student with PENDING status
      const student = await tx.student.create({
        data: {
          school_id: data.school_id,
          admission_number: tempAdmissionNumber,
          first_name: data.student_first_name,
          last_name: data.student_last_name,
          date_of_birth: new Date(data.student_dob),
          gender: data.student_gender,
          nationality: 'Kenyan', // Default for public applications
          medical_condition: data.medical_conditions || null,
          status: 'PENDING', // Mark as pending until admin approves
        },
      });

      // 3. Link Guardian and Student
      await tx.guardianStudent.create({
        data: {
          guardian_id: guardian.id,
          student_id: student.id,
        },
      });

      return { 
        success: true, 
        message: 'Application received successfully',
        application_id: student.id 
      };
    });
  }
}