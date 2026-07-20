// apps/api/src/modules/communication/communication.controller.ts
import { Controller, Post, Body, Get, Query, Req, UnauthorizedException } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { SendSmsDto } from './dto/send-sms.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@ApiTags('Communication')
@Controller('communication')
export class CommunicationController {
  constructor(
    private readonly communicationService: CommunicationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('sms')
  @Permissions('communication:sms:send')
  @AuditEntity('MessageLog')
  async sendSms(@Body() dto: SendSmsDto, @Req() req: any) {
    return this.communicationService.dispatchSms(dto, req.user.id);
  }

  @Post('email')
  @Permissions('communication:email:send')
  @AuditEntity('MessageLog')
  async sendEmail(@Body() dto: SendEmailDto, @Req() req: any) {
    return this.communicationService.dispatchEmail(dto, req.user.id);
  }

  @Get('logs')
  @Permissions('communication:logs:view')
  async getLogs(@Query('channel') channel: string, @Query('status') status: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    return this.prisma.messageLog.findMany({
      where: {
        school_id: context.schoolId,
        channel: channel || undefined,
        status: status || undefined,
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
}