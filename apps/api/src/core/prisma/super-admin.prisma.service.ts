// apps/api/src/core/prisma/super-admin.prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
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

    // Cast to any to bypass strict Prisma middleware type checking issues
    (this as any).$use(async (params: any, next: any) => {
      const startTime = Date.now();
      const result = await next(params);
      
      Promise.resolve().then(() => {
        this.auditService.logAction({
          school_id: null,
          user_id: null,
          action: `SUPER_ADMIN_${params.action.toUpperCase()}`,
          entity_type: params.model,
          entity_id: null,
          after_state: { args: params.args, duration_ms: Date.now() - startTime },
          ip_address: 'SYSTEM',
        } as any);
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