// apps/api/src/core/guards/__tests__/ownership.guard.spec.ts
import { OwnershipGuard } from '../ownership.guard';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('OwnershipGuard', () => {
  let guard: OwnershipGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new OwnershipGuard(reflector);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false); // Not public
  });

  it('should allow access if user is a teacher (not scoped by ownership)', () => {
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'teacher', id: 't1' }, params: { id: 'student-1' } }) }),
      getHandler: () => {}, getClass: () => {},
    } as any;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow student to access their own record', () => {
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'student', student_id: 's1' }, params: { id: 's1' } }) }),
      getHandler: () => {}, getClass: () => {},
    } as any;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should block student from accessing another student\'s record', () => {
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'student', student_id: 's1' }, params: { id: 's2' } }) }),
      getHandler: () => {}, getClass: () => {},
    } as any;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow parent to access their child\'s record', () => {
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'parent', children_ids: ['c1', 'c2'] }, params: { id: 'c1' } }) }),
      getHandler: () => {}, getClass: () => {},
    } as any;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should block parent from accessing non-child record', () => {
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'parent', children_ids: ['c1'] }, params: { id: 'c99' } }) }),
      getHandler: () => {}, getClass: () => {},
    } as any;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});