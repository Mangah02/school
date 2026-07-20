// apps/api/src/modules/nemis/nemis.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'; // ✅ Added UnauthorizedException
import { PrismaService } from '../../core/prisma/prisma.service';
import { tenantStorage } from '../../core/tenant/tenant.context';

@Injectable()
export class NemisService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generates a NEMIS-compliant CSV export for students.
   * API deferred per R-08, so we provide the CSV export path for manual upload.
   */
  async generateStudentCsv() {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard
    
    const students = await this.prisma.student.findMany({
      where: { school_id: context.schoolId, is_deleted: false },
      include: { stream: { include: { class: true } } }
    });

    // NEMIS Required Columns (Mocked UPI for now, as real UPI comes from NEMIS API)
    const csvRows = [
      'Admission_Number,First_Name,Middle_Name,Last_Name,Date_Of_Birth,Gender,NEMIS_UPI,Class,Stream,Curriculum'
    ];

    for (const s of students) {
      const row = [
        s.admission_number,
        s.first_name,
        s.middle_name || '',
        s.last_name,
        s.date_of_birth.toISOString().split('T')[0], // YYYY-MM-DD
        s.gender,
        'PENDING_NEMIS_SYNC', // Placeholder for NEMIS Unique Personal Identifier
        s.stream?.class?.name || 'Unassigned',
        s.stream?.name || 'Unassigned',
        s.curriculum_type
      ].map(field => `"${field}"`).join(','); // Basic CSV escaping
      
      csvRows.push(row);
    }

    return csvRows.join('\n');
  }
}