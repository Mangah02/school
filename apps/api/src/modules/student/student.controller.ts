// apps/api/src/modules/student/student.controller.ts
import { Controller, Get, Post, Put, Body, Query, UseGuards, Req, Param } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';

@ApiTags('Students')
@Controller('student')
@UseGuards(JwtAuthGuard)
export class StudentController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all students for the school' })
  async findAll(@Query() query: any, @Req() req: Request & { user: any }) {
    return this.studentsService.findAll(query, req.user.school_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single student by ID' })
  async findOne(@Param('id') id: string, @Req() req: Request & { user: any }) {
    return this.studentsService.findOne(id, req.user.school_id);
  }

  @Get('unenrolled')
  @ApiOperation({ summary: 'Get students who are not currently enrolled in any class' })
  async getUnenrolledStudents(@Req() req: Request & { user: any }) {
    return this.studentsService.getUnenrolledStudents(req.user.school_id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new student' })
  async createStudent(@Body() body: any, @Req() req: Request & { user: any }) {
    return this.studentsService.createStudent(body, req.user.school_id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing student' })
  async updateStudent(@Param('id') id: string, @Body() body: any, @Req() req: Request & { user: any }) {
    return this.studentsService.updateStudent(id, body, req.user.school_id);
  }
}