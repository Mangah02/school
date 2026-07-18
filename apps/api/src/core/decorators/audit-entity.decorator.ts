// apps/api/src/core/decorators/audit-entity.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const AUDIT_ENTITY_KEY = 'audit_entity';
// Usage: @AuditEntity('Student')
export const AuditEntity = (entityType: string) => SetMetadata(AUDIT_ENTITY_KEY, entityType);