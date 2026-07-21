// apps/api/src/core/prisma/super-admin.prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SuperAdminPrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SuperAdminPrismaService.name);
  
  // Public client for services to use
  public readonly client: PrismaClient;

  constructor() {
    // 1. Simple instantiation. No middleware. No crashes.
    this.client = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_SUPER_ADMIN || process.env.DATABASE_URL,
        },
      },
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.client.$connect();
    this.logger.log('Super Admin Prisma Client connected (BYPASSRLS active)');
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}