// apps/api/src/core/prisma/super-admin.prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SuperAdminPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SuperAdminPrismaService.name);

  constructor(private auditService: AuditService) {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_SUPER_ADMIN,
        },
      },
      log: ['warn', 'error'],
    });

    // REQ-MT-004: ALL cross-school queries must be audit-logged.
    // We attach a middleware specifically to this Super Admin client.
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      const startTime = Date.now();
      
      // Execute the query
      const result = await next(params);
      
      // Fire-and-forget audit log for the cross-school action
      // We don't have a specific school_id or user_id here unless passed in args, 
      // but we log the action, model, and the fact that it was a Super Admin bypass.
      Promise.resolve().then(() => {
        this.auditService.logAction({
          school_id: null, // Cross-school
          user_id: null,   // Extracted from context if needed, or logged as 'SYSTEM_SUPER'
          action: `SUPER_ADMIN_${params.action.toUpperCase()}`,
          entity_type: params.model,
          entity_id: null,
          after_state: { args: params.args, duration_ms: Date.now() - startTime },
          ip_address: 'SYSTEM',
        });
      }).catch(err => this.logger.error('Super Admin audit log failed', err));

      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Super Admin Prisma Client connected (BYPASSRLS active)');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}