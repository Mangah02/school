// apps/api/src/modules/attendance/attendance.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private prisma: PrismaService) {}

  async markAttendance(dto: MarkAttendanceDto, userId: string) {
    const context = tenantStorage.getStore();
    const date = new Date(dto.date);

    // Bulk upsert for performance
    const operations = dto.records.map((record) => {
      const clientTime = record.client_updated_at ? new Date(record.client_updated_at) : new Date();
      
      return this.prisma.attendanceRecord.upsert({
        where: {
          student_id_date: { student_id: record.student_id, date: date }
        },
        update: {
          status: record.status,
          method: 'MANUAL',
          marked_by: userId,
          client_updated_at: clientTime,
          server_updated_at: new Date(),
          is_conflict: false,
        },
        create: {
          school_id: context.schoolId,
          student_id: record.student_id,
          date: date,
          status: record.status,
          method: 'MANUAL',
          marked_by: userId,
          client_updated_at: clientTime,
          server_updated_at: new Date(),
        },
      });
    });

    return this.prisma.$transaction(operations);
  }

  /**
   * REQ-SYNC-003: Handles offline PWA sync with conflict detection
   */
  async syncOfflineAttendance(payload: any[], userId: string) {
    const context = tenantStorage.getStore();
    const results = { accepted: [], rejected: [], conflicts: [] };

    for (const record of payload) {
      const existing = await this.prisma.attendanceRecord.findUnique({
        where: { student_id_date: { student_id: record.student_id, date: new Date(record.date) } }
      });

      const clientTime = new Date(record.client_updated_at);

      if (!existing) {
        // New record, accept it
        await this.prisma.attendanceRecord.create({
          data: {
            school_id: context.schoolId,
            student_id: record.student_id,
            date: new Date(record.date),
            status: record.status,
            method: record.method || 'MANUAL',
            client_updated_at: clientTime,
            server_updated_at: new Date(),
          }
        });
        results.accepted.push(record.student_id);
      } 
      else if (clientTime > existing.server_updated_at) {
        // Client is newer, overwrite (Last-Write-Wins)
        await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            status: record.status,
            client_updated_at: clientTime,
            server_updated_at: new Date(),
            is_conflict: false,
          }
        });
        results.accepted.push(record.student_id);
      } 
      else {
        // Server is newer, flag as conflict for manual resolution (REQ-SYNC-004)
        await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { is_conflict: true }
        });
        results.conflicts.push({ student_id: record.student_id, server_version: existing });
      }
    }

    return results;
  }
}
