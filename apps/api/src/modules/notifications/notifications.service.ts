// apps/api/src/modules/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(userId: string, schoolId: string, limit: number) {
    return this.prisma.notification.findMany({
      where: {
        school_id: schoolId,
        OR: [
          { user_id: userId },
          { user_id: null },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string, schoolId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        school_id: schoolId,
        OR: [{ user_id: userId }, { user_id: null }],
      },
      data: { is_read: true },
    });
  }
}