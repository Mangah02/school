// apps/api/src/core/prisma/prisma.extension.ts
import { Prisma } from '@prisma/client';
import { tenantStorage } from '../tenant/tenant.context';

const TENANT_MODELS = ['User', 'Student', 'Invoice', 'AttendanceRecord', 'AuditLog'];

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-isolation-extension',
  query: {
    $allModels: {
      async $allOperations({ args, query, model, operation }) {
        const context = tenantStorage.getStore();
        
        if (!context?.schoolId) {
          return query(args);
        }

        // Cast args to any to safely access where/data across all operation types
        const typedArgs = args as any;

        if (TENANT_MODELS.includes(model) && operation !== 'create' && operation !== 'createMany') {
          typedArgs.where = typedArgs.where || {};
          if (!typedArgs.where.school_id) {
            typedArgs.where.school_id = context.schoolId;
          }
        }

        if (TENANT_MODELS.includes(model) && operation === 'create') {
          typedArgs.data = typedArgs.data || {};
          if (!typedArgs.data.school_id) {
            typedArgs.data.school_id = context.schoolId;
          }
        }

        return query(typedArgs);
      },
    },
  },
});