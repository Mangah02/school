// apps/api/src/modules/admissions/admissions.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class AdmissionsService {
  constructor(private prisma: PrismaService) {}

  async createApplication(data: any) {
    console.log('Received admission application:', data);
    return { success: true, message: 'Application received successfully' };
  }
}
