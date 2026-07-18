import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { TenantMiddleware } from '../tenant.middleware';
import { tenantStorage } from '../tenant.context';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let mockNext: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantMiddleware],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);
    mockNext = jest.fn();
  });

  it('should call next() and set context for standard user', () => {
    const req = { user: { id: 'user-1', school_id: 'school-1', role: 'teacher' } } as any;
    const res = {} as any;

    middleware.use(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    const context = tenantStorage.getStore();
    expect(context?.schoolId).toBe('school-1');
  });

  it('should call next() without setting context for super_admin', () => {
    const req = { user: { id: 'admin-1', role: 'super_admin' } } as any;
    const res = {} as any;

    middleware.use(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    const context = tenantStorage.getStore();
    expect(context).toBeUndefined();
  });

  it('should throw UnauthorizedException if non-admin lacks school_id', () => {
    const req = { user: { id: 'user-2', role: 'teacher' } } as any;
    const res = {} as any;

    expect(() => middleware.use(req, res, mockNext)).toThrow(UnauthorizedException);
  });
});