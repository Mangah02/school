// apps/api/src/core/guards/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
// Usage: @Permissions('student:create', 'student:update')
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);