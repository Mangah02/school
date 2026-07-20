// apps/api/src/modules/study-material/study-material.service.ts
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'; // ✅ Added UnauthorizedException
import { PrismaService } from '../../core/prisma/prisma.service';
import { StorageService } from '../../core/storage/storage.service'; // MinIO wrapper
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import { tenantStorage } from '../../core/tenant/tenant.context';
import * as Bull from 'bull'; // ✅ FIX: Namespace import for Bull
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class StudyMaterialService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    @InjectQueue('notifications') private notificationsQueue: Bull.Queue, // ✅ FIX: Use Bull.Queue
  ) {}

  async uploadAndPublish(dto: CreateStudyMaterialDto, fileBuffer: Buffer, originalName: string, userId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    // 1. Upload to MinIO
    const fileName = `materials/${context.schoolId}/${Date.now()}-${originalName}`;
    // ✅ FIX: Changed uploadBuffer to upload (or uploadFile, depending on your StorageService implementation)
    const fileUrl = await this.storage.upload(fileName, fileBuffer, 'application/octet-stream');
    dto.file_url = fileUrl;

    // 2. Version Control: Check if a material with the same title exists
    const existingMaterial = await this.prisma.studyMaterial.findFirst({
      where: { school_id: context.schoolId, title: dto.title, is_archived: false }
    });

    if (existingMaterial) {
      // Archive old version
      await this.prisma.studyMaterial.update({
        where: { id: existingMaterial.id },
        data: { is_archived: true }
      });
      dto.title = dto.title; // Keep same title
      // Version increment handled by Prisma default or explicit logic
    }

    // 3. Create new record
    const material = await this.prisma.studyMaterial.create({
      data: {
        ...dto,
        school_id: context.schoolId,
        uploaded_by: userId,
        version: existingMaterial ? existingMaterial.version + 1 : 1,
      },
    });

    // 4. Queue notification to students/parents
    if (dto.visibility !== 'TEACHERS') {
      await this.notificationsQueue.add('send-sms', {
        type: 'new_study_material',
        school_id: context.schoolId,
        class_id: dto.class_id,
        message: `New study material "${dto.title}" has been uploaded. Login to the portal to download.`,
      });
    }

    return material;
  }

  async trackDownload(materialId: string, studentId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard
    
    // Verify material belongs to school and is accessible
    const material = await this.prisma.studyMaterial.findFirst({
      where: { id: materialId, school_id: context.schoolId, is_archived: false }
    });
    if (!material) throw new NotFoundException('Material not found');

    // Log download
    return this.prisma.studyMaterialDownload.create({
      data: { material_id: materialId, student_id: studentId }
    });
  }

  async getMaterialStats(materialId: string) {
    const context = tenantStorage.getStore();
    if (!context) throw new UnauthorizedException('Tenant context missing'); // ✅ Added guard

    const downloads = await this.prisma.studyMaterialDownload.count({
      where: { material_id: materialId, material: { school_id: context.schoolId } }
    });
    return { material_id: materialId, total_downloads: downloads };
  }
}