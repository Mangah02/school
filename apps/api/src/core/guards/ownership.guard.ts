// apps/api/src/core/guards/ownership.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
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
    if (user.role !== 'student' && user.role !== 'parent') {
      return true;
    }

    // Extract the target student ID from route params
    const targetStudentId = request.params?.studentId || request.params?.id;

    // If the route doesn't target a specific student, allow it (Service layer will filter)
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
      const childrenIds: string[] = user.children_ids || [];
      if (!childrenIds.includes(targetStudentId)) {
        throw new ForbiddenException('You can only access your children\'s records');
      }
    }

    return true;
  }
}