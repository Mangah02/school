// apps/api/src/core/guards/ownership.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class OwnershipService {
  /**
   * Returns the list of student IDs the current user is allowed to query.
   * Used in Service layers for list endpoints (e.g., GET /attendance).
   */
  getScopedStudentIds(user: any): string[] | null {
    if (user.role === 'student') {
      return [user.student_id];
    }
    if (user.role === 'parent') {
      return user.children_ids || [];
    }
    // For Teachers/Admins, return null to indicate no ownership scoping is needed 
    // (TenantGuard handles the school-level scoping).
    return null; 
  }
}