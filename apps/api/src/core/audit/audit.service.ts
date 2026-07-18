// apps/api/src/core/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Logs an action to the audit_log table.
   * Designed to be called in a "fire-and-forget" manner to avoid blocking HTTP responses.
   */
  async logAction(params: {
    school_id: string | null;
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    before_state?: any;
    after_state?: any;
    ip_address: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          school_id: params.school_id,
          user_id: params.user_id,
          action: params.action,
          entity_type: params.entity_type,
          entity_id: params.entity_id,
          old_values: params.before_state || undefined,
          new_values: params.after_state || undefined,
          ip_address: params.ip_address,
        },
      });
    } catch (error) {
      // Log error but DO NOT throw, to prevent audit failures from breaking the main request
      this.logger.error(`Failed to write audit log: ${error.message}`, error.stack);
    }
  }
}