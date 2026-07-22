// apps/api/src/modules/guardian/guardian.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class GuardianService {
  constructor(private prisma: PrismaService) {}

  async getGuardians(schoolId: string) {
    return this.prisma.guardian.findMany({
      where: {
        school_id: schoolId,
        is_deleted: false,
      },
      orderBy: { first_name: 'asc' },
    });
  }

  async createGuardian(schoolId: string, data: any) {
    if (!schoolId) {
      throw new BadRequestException('School ID missing from authentication token');
    }

    return this.prisma.guardian.create({
      data: {
        school_id: schoolId,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email || null,
        relationship: data.relationship,
        is_primary: data.is_primary || false,
        is_deleted: false,
      },
    });
  }
}