// apps/api/src/core/prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SuperAdminPrismaService } from './super-admin.prisma.service';

@Global() // ✅ Makes Prisma services available everywhere
@Module({
  providers: [PrismaService, SuperAdminPrismaService],
  exports: [PrismaService, SuperAdminPrismaService],
})
export class PrismaModule {}