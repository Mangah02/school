// apps/api/src/modules/finance/waiver.controller.ts
import { Controller, Post, Body, Get, Param, Req } from '@nestjs/common'; // ✅ Import Req
import { WaiverService } from './waiver.service';
import { RequestWaiverDto, ProcessWaiverDto } from './dto/fee-waiver.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Finance - Waivers')
@Controller('finance/waivers')
export class WaiverController {
  constructor(private readonly waiverService: WaiverService) {}

  @Post('request')
  @Permissions('finance:waiver:request')
  @AuditEntity('FeeWaiver')
  async request(@Body() dto: RequestWaiverDto, @Req() req: any) { // ✅ Use @Req() and type as any
    return this.waiverService.requestWaiver(dto, req.user.id);
  }

  @Post('process')
  @Permissions('finance:waiver:approve')
  @AuditEntity('FeeWaiver')
  async process(@Body() dto: ProcessWaiverDto, @Req() req: any) { // ✅ Use @Req() and type as any
    return this.waiverService.processWaiver(dto, req.user.id, req.user.role);
  }

  @Get('pending')
  @Permissions('finance:waiver:approve')
  async getPending() {
    // Implementation would filter by user role and status = 'PENDING'
    return { message: 'Fetch pending waivers based on role' };
  }
}