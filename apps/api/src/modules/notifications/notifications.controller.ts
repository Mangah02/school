// apps/api/src/modules/notifications/notifications.controller.ts
import { Controller, Get, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(@Req() req: Request & { user: any }, @Query('limit') limit: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.notificationsService.getNotifications(req.user.sub, req.user.school_id, limitNum);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Req() req: Request & { user: any }, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, req.user.sub, req.user.school_id);
  }
}