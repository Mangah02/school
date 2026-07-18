// apps/api/src/core/interceptors/__tests__/audit.interceptor.spec.ts
import { AuditInterceptor } from '../audit.interceptor';
import { AuditService } from '../../audit/audit.service';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: AuditService;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    auditService = { logAction: jest.fn() } as any;
    interceptor = new AuditInterceptor(reflector, auditService);
  });

  it('should NOT log GET requests', (done) => {
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ method: 'GET', user: {}, params: {} }) }),
      getHandler: () => {}, getClass: () => {},
    } as any;
    
    const next = { handle: () => of({ data: 'test' }) };

    interceptor.intercept(context, next).subscribe(() => {
      expect(auditService.logAction).not.toHaveBeenCalled();
      done();
    });
  });

  it('should log POST requests asynchronously', (done) => {
    jest.spyOn(reflector, 'get').mockReturnValue('Student');
    const context = {
      switchToHttp: () => ({ 
        getRequest: () => ({ 
          method: 'POST', 
          user: { id: 'u1', school_id: 'sch1' }, 
          params: {},
          ip: '127.0.0.1'
        }) 
      }),
      getHandler: () => {}, getClass: () => {},
    } as any;
    
    const responseData = { id: 'new-student-id' };
    const next = { handle: () => of(responseData) };

    interceptor.intercept(context, next).subscribe(() => {
      // Because it's fire-and-forget via Promise.resolve().then(), 
      // we need to wait a tick for the mock to be called.
      setTimeout(() => {
        expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({
          action: 'POST',
          entity_type: 'Student',
          user_id: 'u1',
          after_state: responseData,
        }));
        done();
      }, 10);
    });
  });
});