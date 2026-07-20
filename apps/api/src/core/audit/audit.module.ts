// apps/api/src/core/audit/audit.module.ts
import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../prisma/prisma.module'; // ✅ Import PrismaModule

@Global() // Optional: Makes AuditService available everywhere without importing AuditModule
@Module({
  imports: [PrismaModule], // ✅ Add PrismaModule here so AuditService can use it
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}