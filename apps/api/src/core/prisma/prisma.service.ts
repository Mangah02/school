import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { tenantStorage } from '../tenant/tenant.context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      // Apply the RLS extension automatically to all clients
      // @ts-ignore - Prisma extension typing can be tricky, handled in extension file
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Explicitly execute a block of code with SET LOCAL enforced.
   * Used for critical writes where DB-level RLS must be strictly verified.
   */
  async withTenantRLS<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const context = tenantStorage.getStore();
    if (!context?.schoolId) {
      throw new Error('Tenant context not set. Cannot execute with RLS.');
    }

    return this.$transaction(async (tx) => {
      // Execute SET LOCAL for this specific transaction
      await tx.$executeRawUnsafe(`SET LOCAL app.current_school_id = '${context.schoolId}'`);
      
      // Execute the callback within the RLS-enforced transaction
      return callback(tx);
    });
  }
}