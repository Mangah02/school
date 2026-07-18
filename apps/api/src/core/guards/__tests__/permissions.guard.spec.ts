// apps/api/src/core/guards/__tests__/permissions.guard.spec.ts
import { PermissionsGuard } from '../permissions.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('should allow access if user has required permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['student:create']);
    
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions: ['student:create', 'student:read'] } }) }),
      getHandler: () => {},
      getClass: () => {},
    } as any;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['finance:waiver:approve']);
    
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions: ['student:create'] } }) }),
      getHandler: () => {},
      getClass: () => {},
    } as any;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should bypass checks for super_admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['finance:waiver:approve']);
    
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'super_admin', permissions: [] } }) }),
      getHandler: () => {},
      getClass: () => {},
    } as any;

    expect(guard.canActivate(context)).toBe(true);
  });
});