import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  schoolId: string;
  userId: string;
}

// Global storage for the current request's tenant context
export const tenantStorage = new AsyncLocalStorage<TenantContext>();