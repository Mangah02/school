// apps/api/src/modules/boarding/boarding.service.ts
import { Injectable, BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class BoardingService {
  constructor(private prisma: PrismaService) {}

  async allocateBed(studentId: string, bedId: string, academicYearId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify Student Gender matches Dormitory Type
      const student = await tx.student.findFirst({
        where: { id: studentId, school_id: context.schoolId }
      });
      if (!student) throw new NotFoundException('Student not found');

      const bed = await tx.bed.findFirst({
        where: { id: bedId, dormitory: { school_id: context.schoolId } },
        include: { dormitory: true }
      });
      if (!bed) throw new NotFoundException('Bed not found');
      if (bed.status !== 'AVAILABLE') throw new ConflictException('Bed is not available');

      // Strict Gender Enforcement
      if (bed.dormitory.type === 'BOYS' && student.gender !== 'M') {
        throw new BadRequestException('Cannot allocate a female student to a boys dormitory');
      }
      if (bed.dormitory.type === 'GIRLS' && student.gender !== 'F') {
        throw new BadRequestException('Cannot allocate a male student to a girls dormitory');
      }

      // 2. Create Assignment
      await tx.bedAssignment.create({
        data: {
          school_id: context.schoolId,
          student_id: studentId,
          bed_id: bedId,
          academic_year_id: academicYearId,
          status: 'ACTIVE'
        }
      });

      // 3. Mark Bed as Occupied
      await tx.bed.update({
        where: { id: bedId },
        data: { status: 'OCCUPIED' }
      });

      return { success: true, message: 'Bed allocated successfully' };
    });
  }

  async markRollCall(dormitoryId: string, session: string, records: { student_id: string, status: string }[]) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');
    
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const rollCall = await tx.rollCall.create({
        data: {
          school_id: context.schoolId,
          dormitory_id: dormitoryId,
          date: now,
          time: now,
          session: session, // MORNING or EVENING
          marked_by: context.userId
        }
      });

      if (records.length > 0) {
        await tx.rollCallRecord.createMany({
          data: records.map(r => ({
            roll_call_id: rollCall.id,
            student_id: r.student_id,
            status: r.status // PRESENT, ABSENT, SICK, PERMISSION
          }))
        });
      }

      return { success: true, roll_call_id: rollCall.id, records_marked: records.length };
    });
  }
}