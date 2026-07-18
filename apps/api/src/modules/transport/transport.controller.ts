// apps/api/src/modules/transport/transport.controller.ts
import { Controller, Post, Body, Param } from '@nestjs/common';
import { TransportService } from './transport.service';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Transport')
@Controller('transport')
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Post('assign')
  @Permissions('transport:assign')
  @AuditEntity('BusAssignment')
  async assign(@Body() body: { student_id: string, route_id: string, pickup_point: string, dropoff_point: string }) {
    return this.transportService.assignStudentToRoute(body.student_id, body.route_id, body.pickup_point, body.dropoff_point);
  }

  @Post('routes/:routeId/delay')
  @Permissions('transport:manage')
  async recordDelay(@Param('routeId') routeId: string, @Body() body: { delay_minutes: number, reason: string }) {
    return this.transportService.recordBusDelay(routeId, body.delay_minutes, body.reason);
  }
}