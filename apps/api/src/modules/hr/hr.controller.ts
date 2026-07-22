// apps/api/src/modules/hr/hr.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { HrService } from './hr.service';
import { PayrollService } from './payroll.service';
import { StaffAttendanceService } from './staff-attendance.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CreateLeaveRequestDto } from './dto/leave-request.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';

@ApiTags('HR & Payroll')
@Controller('hr')
export class HrController {
  constructor(
    private readonly hrService: HrService,
    private readonly payrollService: PayrollService,
    private readonly attendanceService: StaffAttendanceService,
  ) {}

  // --- STAFF RECORDS ---
  
  // ✅ NEW: Get all staff (with optional role filter for timetable)
  @Get('staff')
  @Permissions('hr:staff:view')
  @ApiOperation({ summary: 'Get all staff members, optionally filtered by role' })
    async getAllStaff(@Req() req: Request & { user: any }, @Query('role') role?: string) {
    return this.hrService.getStaff(req.user.school_id, role);
  }

  @Get('staff/:id')
  @Permissions('hr:staff:view')
  @ApiOperation({ summary: 'Get a specific staff member profile' })
  async getStaffProfile(@Param('id') id: string) {
    return this.hrService.getStaffProfile(id);
  }

  @Post('staff')
  @Permissions('hr:staff:create')
  @AuditEntity('Staff')
  @ApiOperation({ summary: 'Create a new staff member' })
  async createStaff(@Body() dto: CreateStaffDto, @Req() req: Request & { user: any }) {
    return this.hrService.createStaff(dto, req.user.sub);
  }

  // --- PAYROLL ---
  @Post('payroll/process')
  @Permissions('hr:payroll:process')
  @AuditEntity('PayrollRecord')
  @ApiOperation({ summary: 'Process monthly payroll' })
  async processPayroll(@Body() body: { month: number, year: number }) {
    return this.payrollService.processMonthlyPayroll(body.month, body.year);
  }

  // --- STAFF ATTENDANCE ---
  @Post('attendance')
  @Permissions('hr:attendance:manage')
  @AuditEntity('StaffAttendance')
  @ApiOperation({ summary: 'Mark staff attendance' })
  async markAttendance(@Body() body: { staff_id: string, date: string, status: string }) {
    return this.attendanceService.markAttendance(body.staff_id, body.date, body.status);
  }

  @Get('attendance/report')
  @Permissions('hr:attendance:view')
  @ApiOperation({ summary: 'Get staff attendance report' })
  async getAttendanceReport(@Query('month') month: number, @Query('year') year: number) {
    return this.attendanceService.getStaffAttendanceReport(month, year);
  }
}