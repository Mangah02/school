// apps/api/src/core/interceptors/audit.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_ENTITY_KEY } from '../decorators/audit-entity.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutating requests (SRS 36.6)
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const entityType = this.reflector.get<string>(AUDIT_ENTITY_KEY, context.getHandler()) || 'Unknown';
    
    // Extract entity ID from params (e.g., /students/:id)
    const entityId = request.params?.id || request.params?.studentId || null;

    return next.handle().pipe(
      tap((responseData) => {
        const user = request.user;
        const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';

        // Fire-and-forget audit logging. 
        // We use Promise.resolve().then() to ensure it runs after the response is sent,
        // without blocking the RxJS stream.
        Promise.resolve().then(() => {
          this.auditService.logAction({
            school_id: user?.school_id || null,
            user_id: user?.id || null,
            action: method,
            entity_type: entityType,
            entity_id: entityId,
            // Note: Capturing before_state for PUT/PATCH requires Service-layer cooperation 
            // or Prisma middleware. For now, we log the after_state (response data).
            after_state: responseData, 
            ip_address: ip,
          });
        }).catch(err => this.logger.error('Audit interceptor fire-and-forget failed', err));
      }),
    );
  }
}