// apps/api/src/modules/boarding/boarding.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { BoardingService } from './boarding.service';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Boarding')
@Controller('boarding')
export class BoardingController {
  constructor(private readonly boardingService: BoardingService) {}

  @Post('allocate')
  @Permissions('boarding:allocate')
  @AuditEntity('BedAssignment')
  async allocate(@Body() body: { student_id: string, bed_id: string, academic_year_id: string }) {
    return this.boardingService.allocateBed(body.student_id, body.bed_id, body.academic_year_id);
  }

  @Post('roll-call')
  @Permissions('boarding:roll-call')
  @AuditEntity('RollCall')
  async markRollCall(@Body() body: { dormitory_id: string, session: string, records: { student_id: string, status: string }[] }) {
    return this.boardingService.markRollCall(body.dormitory_id, body.session, body.records);
  }
}