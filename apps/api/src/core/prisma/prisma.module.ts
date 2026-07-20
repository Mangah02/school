// apps/api/src/core/prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SuperAdminPrismaService } from './super-admin.prisma.service'; // ✅ Import it

@Global() 
@Module({
  providers: [
    PrismaService, 
    SuperAdminPrismaService // ✅ Add it here
  ],
  exports: [
    PrismaService, 
    SuperAdminPrismaService // ✅ And export it so AnalyticsService can use it
  ],
})
export class PrismaModule {}