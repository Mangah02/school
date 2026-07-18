// apps/api/src/modules/transport/transport.service.ts
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class TransportService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('sms-queue') private smsQueue: Queue,
  ) {}

  async assignStudentToRoute(studentId: string, routeId: string, pickup: string, dropoff: string) {
    const context = tenantStorage.getStore();

    // Verify route capacity
    const route = await this.prisma.transportRoute.findFirst({
      where: { id: routeId, school_id: context.schoolId },
      include: { bus: true, assignments: { where: { status: 'ACTIVE' } } }
    });
    if (!route) throw new BadRequestException('Route not found');
    if (route.assignments.length >= route.bus.capacity) {
      throw new ConflictException('Bus route is at full capacity');
    }

    try {
      return await this.prisma.busAssignment.create({
        data: {
          school_id: context.schoolId,
          student_id: studentId,
          route_id: routeId,
          pickup_point: pickup,
          dropoff_point: dropoff,
          status: 'ACTIVE'
        }
      });
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('Student is already assigned to this route');
      throw error;
    }
  }

  /**
   * Records a bus delay and automatically triggers SMS notifications to all assigned parents.
   */
  async recordBusDelay(routeId: string, delayMinutes: number, reason: string) {
    const context = tenantStorage.getStore();

    const route = await this.prisma.transportRoute.findFirst({
      where: { id: routeId, school_id: context.schoolId },
      include: { 
        assignments: { 
          where: { status: 'ACTIVE' },
          include: { student: { include: { guardians: { include: { guardian: true } } } } }
        }
      }
    });
    if (!route) throw new BadRequestException('Route not found');

    const notifications = [];
    for (const assignment of route.assignments) {
      const primaryGuardian = assignment.student.guardians.find(g => g.guardian.is_primary)?.guardian;
      if (primaryGuardian && primaryGuardian.phone) {
        notifications.push(
          this.smsQueue.add('send-sms', {
            school_id: context.schoolId,
            recipient_id: primaryGuardian.id,
            recipient_contact: primaryGuardian.phone,
            message: `ALERT: ${route.name} is delayed by approx. ${delayMinutes} mins. Reason: ${reason}. Student: ${assignment.student.first_name}.`
          })
        );
      }
    }

    await Promise.all(notifications);
    return { success: true, notifications_sent: notifications.length };
  }
}