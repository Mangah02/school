// apps/api/src/modules/hr/staff-attendance.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class StaffAttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendance(staffId: string, date: string, status: string) {
    const context = tenantStorage.getStore();
    const attendanceDate = new Date(date);

    return this.prisma.staffAttendance.upsert({
      where: { staff_id_date: { staff_id: staffId, date: attendanceDate } },
      update: { status, check_out: status === 'PRESENT' ? new Date() : null },
      create: {
        school_id: context.schoolId,
        staff_id: staffId,
        date: attendanceDate,
        status,
        check_in: new Date()
      }
    });
  }

  async getStaffAttendanceReport(month: number, year: number) {
    const context = tenantStorage.getStore();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.prisma.staffAttendance.findMany({
      where: {
        school_id: context.schoolId,
        date: { gte: startDate, lte: endDate }
      },
      include: { staff: { select: { first_name: true, last_name: true, employee_id: true } } },
      orderBy: { date: 'asc' }
    });
  }
}