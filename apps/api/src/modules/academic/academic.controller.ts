// apps/api/src/modules/academic/academic.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Query, UseGuards, Req, Param } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';

@ApiTags('Academics')
@Controller('academic')
@UseGuards(JwtAuthGuard)
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // --- ACADEMIC YEARS ---
  @Get('academic-years')
  @ApiOperation({ summary: 'Get all academic years for the school' })
  async getAcademicYears(@Req() req: Request & { user: any }) {
    return this.academicService.getAcademicYears(req.user.school_id);
  }

  @Post('academic-years')
  @ApiOperation({ summary: 'Create a new academic year' })
  async createAcademicYear(@Req() req: Request & { user: any }, @Body() body: any) {
    return this.academicService.createAcademicYear(req.user.school_id, body);
  }

  @Put('academic-years/:id')
  @ApiOperation({ summary: 'Update an academic year (e.g., set as active)' })
  async updateAcademicYear(@Req() req: Request & { user: any }, @Param('id') id: string, @Body() body: any) {
    return this.academicService.updateAcademicYear(req.user.school_id, id, body);
  }

  // --- CLASSES & STREAMS ---
  @Get('classes')
  @ApiOperation({ summary: 'Get all classes and streams for the school' })
  async getClasses(@Req() req: Request & { user: any }) {
    return this.academicService.getClasses(req.user.school_id);
  }

  @Post('classes')
  @ApiOperation({ summary: 'Create a new class with streams' })
  async createClass(@Req() req: Request & { user: any }, @Body() body: any) {
    return this.academicService.createClass(req.user.school_id, body);
  }

  @Put('classes/:id')
  @ApiOperation({ summary: 'Update a class and its streams' })
  async updateClass(@Req() req: Request & { user: any }, @Param('id') id: string, @Body() body: any) {
    return this.academicService.updateClass(req.user.school_id, id, body);
  }

  // --- SUBJECTS ---
  @Get('subjects')
  @ApiOperation({ summary: 'Get all subjects for the school' })
  async getSubjects(@Req() req: Request & { user: any }) {
    return this.academicService.getSubjects(req.user.school_id);
  }

  @Post('subjects')
  @ApiOperation({ summary: 'Create a new subject' })
  async createSubject(@Req() req: Request & { user: any }, @Body() body: any) {
    return this.academicService.createSubject(req.user.school_id, body);
  }

  @Put('subjects/:id')
  @ApiOperation({ summary: 'Update a subject' })
  async updateSubject(@Req() req: Request & { user: any }, @Param('id') id: string, @Body() body: any) {
    return this.academicService.updateSubject(req.user.school_id, id, body);
  }

  @Delete('subjects/:id')
  @ApiOperation({ summary: 'Delete a subject' })
  async deleteSubject(@Req() req: Request & { user: any }, @Param('id') id: string) {
    return this.academicService.deleteSubject(req.user.school_id, id);
  }

  // --- ENROLLMENTS ---
  @Post('enrollments')
  @ApiOperation({ summary: 'Enroll a student in a class/stream' })
  async enrollStudent(@Req() req: Request & { user: any }, @Body() body: { student_id: string; stream_id: string }) {
    return this.academicService.enrollStudent(body.student_id, body.stream_id, req.user.school_id);
  }

  // --- TIMETABLES ---
  @Get('timetables')
  @ApiOperation({ summary: 'Get timetable slots for a specific stream' })
  async getTimetable(@Query('stream_id') streamId: string, @Req() req: Request & { user: any }) {
    return this.academicService.getTimetable(req.user.school_id, streamId);
  }

  @Post('timetables')
  @ApiOperation({ summary: 'Create a new timetable slot' })
  async createTimetableSlot(@Req() req: Request & { user: any }, @Body() body: any) {
    return this.academicService.createTimetableSlot(req.user.school_id, body);
  }

  @Put('timetables/:id')
  @ApiOperation({ summary: 'Update an existing timetable slot' })
  async updateTimetableSlot(@Req() req: Request & { user: any }, @Param('id') id: string, @Body() body: any) {
    return this.academicService.updateTimetableSlot(req.user.school_id, id, body);
  }
}