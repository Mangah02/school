import { Prisma } from '@prisma/client';
import { tenantStorage } from '../tenant/tenant.context';

// Models that require strict tenant isolation
const TENANT_MODELS = ['User', 'Student', 'Invoice', 'AttendanceRecord', 'AuditLog'];

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-isolation-extension',
  query: {
    $allModels: {
      async $allOperations({ args, query, model, operation }) {
        const context = tenantStorage.getStore();
        
        // If no context (e.g., Super Admin or public route), execute normally
        if (!context?.schoolId) {
          return query(args);
        }

        // For read/update/delete operations, automatically inject school_id into the WHERE clause
        if (TENANT_MODELS.includes(model) && operation !== 'create') {
          args.where = args.where || {};
          
          // Prevent overriding if already explicitly set (e.g., by Super Admin)
          if (!args.where.school_id) {
            args.where.school_id = context.schoolId;
          }
        }

        // For create operations, automatically inject school_id into the data payload
        if (TENANT_MODELS.includes(model) && operation === 'create') {
          args.data = args.data || {};
          if (!args.data.school_id) {
            args.data.school_id = context.schoolId;
          }
        }

        return query(args);
      },
    },
  },
});

// Apply extension to PrismaService
// Note: In Prisma 5+, extensions are applied via $extends()
// In prisma.service.ts constructor: super().$extends(tenantExtension)