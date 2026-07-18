import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantStorage } from './tenant.context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // JwtAuthGuard runs before this and populates req.user
    const user = (req as any).user;

    if (!user) {
      // Public routes should bypass this middleware or be handled by @Public()
      return next();
    }

    // Super Admins bypass tenant isolation
    if (user.role === 'super_admin') {
      return next();
    }

    if (!user.school_id) {
      throw new UnauthorizedException('Tenant context missing for non-admin user');
    }

    // Set the context for this specific request lifecycle
    tenantStorage.enterWith({ 
      schoolId: user.school_id, 
      userId: user.id 
    });
    
    next();
  }
}