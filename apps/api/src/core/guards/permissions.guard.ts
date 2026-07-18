// apps/api/src/core/guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions are specified, allow access (rely on AuthGuard only)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super Admin has all permissions (REQ-MT-004)
    if (user.role === 'super_admin') {
      return true;
    }

    // Check if user's permissions (loaded into JWT or fetched from Redis/DB) 
    // include ALL required permissions for this route
    const userPermissions: string[] = user.permissions || [];
    
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(`Missing required permission(s): ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}