// apps/api/src/modules/academic/academic.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';

@ApiTags('Academics')
@Controller('academic')
@UseGuards(JwtAuthGuard)
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

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
  async updateClass(
    @Req() req: Request & { user: any },
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.academicService.updateClass(req.user.school_id, id, body);
  }
  // ... (keep your existing Class routes above)

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
  async updateSubject(
    @Req() req: Request & { user: any },
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.academicService.updateSubject(req.user.school_id, id, body);
  }

  @Delete('subjects/:id')
  @ApiOperation({ summary: 'Delete a subject' })
  async deleteSubject(@Req() req: Request & { user: any }, @Param('id') id: string) {
    return this.academicService.deleteSubject(req.user.school_id, id);
  }
  // --- TIMETABLE ---
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
  async updateTimetableSlot(
    @Req() req: Request & { user: any },
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.academicService.updateTimetableSlot(req.user.school_id, id, body);
  }


}