// apps/api/src/modules/hr/hr.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { HrService } from './hr.service';
import { PayrollService } from './payroll.service';
import { StaffAttendanceService } from './staff-attendance.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CreateLeaveRequestDto } from './dto/leave-request.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('HR & Payroll')
@Controller('hr')
export class HrController {
  constructor(
    private readonly hrService: HrService,
    private readonly payrollService: PayrollService,
    private readonly attendanceService: StaffAttendanceService,
  ) {}

  // --- STAFF RECORDS ---
  @Post('staff')
  @Permissions('hr:staff:create') // ONLY HR/Admin
  @AuditEntity('Staff')
  async createStaff(@Body() dto: CreateStaffDto, @Request() req) {
    return this.hrService.createStaff(dto, req.user.id);
  }

  @Get('staff/:id')
  @Permissions('hr:staff:view') // ONLY HR/Admin
  async getStaff(@Param('id') id: string) {
    return this.hrService.getStaffProfile(id);
  }

  // --- PAYROLL ---
  @Post('payroll/process')
  @Permissions('hr:payroll:process') // ONLY HR/Admin
  @AuditEntity('PayrollRecord')
  async processPayroll(@Body() body: { month: number, year: number }) {
    return this.payrollService.processMonthlyPayroll(body.month, body.year);
  }

  // --- STAFF ATTENDANCE ---
  // SRS 19.2: ONLY HR/Admin role can access staff attendance. Teachers are explicitly barred.
  @Post('attendance')
  @Permissions('hr:attendance:manage') // Strict HR-only permission
  @AuditEntity('StaffAttendance')
  async markAttendance(@Body() body: { staff_id: string, date: string, status: string }) {
    return this.attendanceService.markAttendance(body.staff_id, body.date, body.status);
  }

  @Get('attendance/report')
  @Permissions('hr:attendance:view') // Strict HR-only permission
  async getAttendanceReport(@Body() body: { month: number, year: number }) {
    return this.attendanceService.getStaffAttendanceReport(body.month, body.year);
  }
}