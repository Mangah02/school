// apps/api/src/core/guards/ownership.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Ownership scoping ONLY applies to Students and Parents.
    // Teachers, Admins, etc., are governed by TenantGuard and PermissionsGuard.
    if (user.role !== 'student' && user.role !== 'parent') {
      return true;
    }

    // Extract the target student ID from route params (e.g., /students/:id, /attendance/:studentId)
    const targetStudentId = request.params?.studentId || request.params?.id;

    // If the route doesn't target a specific student (e.g., a list query GET /students),
    // the Guard allows it, but the Service layer MUST use OwnershipService to filter the query.
    if (!targetStudentId) {
      return true;
    }

    // Validate ownership
    if (user.role === 'student') {
      if (targetStudentId !== user.student_id) {
        throw new ForbiddenException('You can only access your own records');
      }
    }

    if (user.role === 'parent') {
      // REQ-PAR-001: Parent can have multiple children
      const childrenIds: string[] = user.children_ids || [];
      if (!childrenIds.includes(targetStudentId)) {
        throw new ForbiddenException('You can only access your children\'s records');
      }
    }

    return true;
  }
}