// apps/api/src/modules/compliance/dsar.service.ts
import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class DsarService {
  constructor(private prisma: PrismaService) {}

  /**
   * KDPA Right to Access: Exports all data linked to a specific entity.
   */
  async exportData(entityType: string, entityId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    if (entityType === 'STUDENT') {
      const student = await this.prisma.student.findFirst({
        where: { id: entityId, school_id: context.schoolId },
        include: {
          guardians: { include: { guardian: true } },
          attendanceRecords: true,
          examResults: { include: { subject: true } },
          medicalRecord: true,
          bookLoans: true,
          busAssignments: true,
        }
      });
      if (!student) throw new NotFoundException('Student not found');
      return { entity_type: 'STUDENT', data: student };
    }

    if (entityType === 'GUARDIAN') {
      const guardian = await this.prisma.guardian.findFirst({
        where: { id: entityId, school_id: context.schoolId },
        include: {
          students: { include: { student: true } }
        }
      });
      if (!guardian) throw new NotFoundException('Guardian not found');
      return { entity_type: 'GUARDIAN', data: guardian };
    }

    throw new BadRequestException('Unsupported entity type for export');
  }

  /**
   * KDPA Right to be Forgotten: Initiates a deletion request.
   * Requires DPO/Admin approval to execute.
   */
  async requestDeletion(entityType: string, entityId: string, reason: string, userId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    // Verify entity exists
    let entityExists = false;
    if (entityType === 'STUDENT') {
      entityExists = !!(await this.prisma.student.findFirst({ where: { id: entityId, school_id: context.schoolId } }));
    } else if (entityType === 'GUARDIAN') {
      entityExists = !!(await this.prisma.guardian.findFirst({ where: { id: entityId, school_id: context.schoolId } }));
    }
    
    if (!entityExists) throw new NotFoundException('Target entity not found in this school');

    return this.prisma.deletionRequest.create({
      data: {
        school_id: context.schoolId,
        requested_by_id: userId,
        target_entity_type: entityType,
        target_entity_id: entityId,
        reason,
        status: 'PENDING'
      }
    });
  }

  /**
   * DPO/Admin executes the approved deletion request by anonymizing all PII.
   */
  async processDeletion(requestId: string, dpoUserId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing');

    const request = await this.prisma.deletionRequest.findFirst({
      where: { id: requestId, school_id: context.schoolId, status: 'PENDING' }
    });
    if (!request) throw new BadRequestException('Request not found or already processed');

    return this.prisma.$transaction(async (tx) => {
      // Anonymize based on entity type
      if (request.target_entity_type === 'STUDENT') {
        await tx.student.update({
          where: { id: request.target_entity_id },
          data: {
            first_name: 'ANONYMIZED',
            last_name: 'ANONYMIZED',
            admission_number: `DEL_${request.target_entity_id.slice(0, 8)}`,
            nationality: 'ANONYMIZED', // Changed from null to string to satisfy Prisma schema
            blood_group: null,         // These are String? in schema, so null is valid
            medical_condition: null,
            photo_url: null,
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: dpoUserId
          }
        });
        // Also anonymize medical records
        await tx.medicalRecord.updateMany({
          where: { student_id: request.target_entity_id },
          data: { 
            allergies: 'ANONYMIZED', 
            chronic_conditions: 'ANONYMIZED', 
            current_medications: 'ANONYMIZED' 
          }
        });
      } 
      else if (request.target_entity_type === 'GUARDIAN') {
        await tx.guardian.update({
          where: { id: request.target_entity_id },
          data: {
            first_name: 'ANONYMIZED',
            last_name: 'ANONYMIZED',
            phone: 'ANONYMIZED',
            email: 'ANONYMIZED',
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: dpoUserId
          }
        });
      }

      // Mark request as completed
      await tx.deletionRequest.update({
        where: { id: requestId },
        data: { 
          status: 'COMPLETED', 
          processed_by_id: dpoUserId, 
          processed_at: new Date() 
        }
      });

      // Immutable Audit Log
      await tx.auditLog.create({
        data: {
          school_id: context.schoolId,
          user_id: dpoUserId,
          action: 'DSAR_DELETION_EXECUTED',
          entity_type: request.target_entity_type,
          entity_id: request.target_entity_id,
          new_values: { reason: request.reason }
        }
      });

      return { success: true, message: 'PII successfully anonymized and marked as deleted.' };
    });
  }
}