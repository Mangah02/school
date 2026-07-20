// apps/api/src/core/guards/tenant.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { tenantStorage } from '../tenant/tenant.context';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Bypass tenant isolation for public routes (e.g., MPESA callback, Login)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true; 
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Populated by JwtAuthGuard

    if (!user) {
      throw new UnauthorizedException('User context missing');
    }

    // Super Admins bypass tenant isolation (REQ-MT-004)
    if (user.role === 'super_admin') {
     tenantStorage.enterWith({ schoolId: 'SUPER_ADMIN', userId: user.id });
      return true;
    }

    if (!user.school_id) {
      throw new UnauthorizedException('Tenant context missing for non-admin user');
    }

    // tenantStorage.enterWith({ schoolId: user.school_id, userId: user.id });
    // //Set the tenant context for this specific request lifecycle
    tenantStorage.enterWith({ 
      schoolId: user.school_id, 
      userId: user.id,
    });

    return true;
  }
}