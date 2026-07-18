// apps/api/src/modules/health/health.controller.ts
import { Controller, Post, Body, Put, Param } from '@nestjs/common';
import { HealthService } from './health.service';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health & Clinic')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Put('records/:studentId')
  // SRS 19.3: ONLY School Nurse / Admin can access. Teachers explicitly barred.
  @Permissions('health:records:manage') 
  @AuditEntity('MedicalRecord')
  async upsertRecord(
    @Param('studentId') studentId: string, 
    @Body() body: { allergies: string, chronic_conditions: string, current_medications: string, consent_evidence_url?: string },
    @Request() req
  ) {
    return this.healthService.upsertMedicalRecord(studentId, body, req.user.id);
  }

  @Post('visits')
  @Permissions('health:records:manage')
  @AuditEntity('ClinicVisit')
  async logVisit(
    @Body() body: { student_id: string, symptoms: string, diagnosis?: string, treatment: string, nurse_notes?: string },
    @Request() req
  ) {
    return this.healthService.logClinicVisit(body.student_id, body, req.user.id);
  }

  @Post('consent/:studentId/revoke')
  @Permissions('health:consent:revoke') // DPO or Principal
  @AuditEntity('ConsentRecord')
  async revokeConsent(@Param('studentId') studentId: string, @Body() body: { category: string }) {
    return this.healthService.revokeConsent(studentId, body.category);
  }
}