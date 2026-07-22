import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

// Core Imports
import { PrismaModule } from './core/prisma/prisma.module';
import { TenantModule } from './core/tenant/tenant.module';
import { RedisModule } from './core/redis/redis.module';
import { AuditModule } from './core/audit/audit.module';
import { QueueModule } from './core/queue/queue.module';
import { StorageModule } from './core/storage/storage.module';
import { SearchModule } from './core/search/search.module';

// Functional Module Imports (All 20)
import { StudentModule } from './modules/student/student.module';
import { AcademicModule } from './modules/academic/academic.module';
import { ExamModule } from './modules/exam/exam.module';
import { CbtModule } from './modules/cbt/cbt.module';
import { StudyMaterialModule } from './modules/study-material/study-material.module';
import { ReportModule } from './modules/report/report.module';
import { ExtraCurricularModule } from './modules/extra-curricular/extra-curricular.module';
import { CredentialPrinterModule } from './modules/credential-printer/credential-printer.module';
import { HrModule } from './modules/hr/hr.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { FinanceModule } from './modules/finance/finance.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { LibraryModule } from './modules/library/library.module';
import { TransportModule } from './modules/transport/transport.module';
import { BoardingModule } from './modules/boarding/boarding.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { HealthModule } from './modules/health/health.module';
import { PublicWebsiteModule } from './modules/public-website/public-website.module';
import { GuardianModule } from './modules/guardian/guardian.module';

// Global Guards & Interceptors
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from './core/guards/tenant.guard';
import { PermissionsGuard } from './core/guards/permissions.guard';
import { OwnershipGuard } from './core/guards/ownership.guard';
import { AuditInterceptor } from './core/interceptors/audit.interceptor';
import { AppGateway } from './app.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'), // undefined is fine if you don't use one
        },
      }),
      inject: [ConfigService],
    }),

    // Core
    PrismaModule, 
    AuthModule,
    TenantModule, 
    RedisModule, 
    AuditModule, 
    QueueModule, 
    StorageModule, 
    SearchModule,
     ComplianceModule,
    NotificationsModule,
    GuardianModule,
    
    // Functional (PublicWebsiteModule is imported here, handling its own internals)
    StudentModule, 
    AcademicModule, 
    ExamModule, 
    CbtModule, 
    StudyMaterialModule, 
    ReportModule, 
    ExtraCurricularModule, 
    CredentialPrinterModule, 
    HrModule, 
    AttendanceModule, 
    FinanceModule, 
    CommunicationModule, 
    AnalyticsModule, 
    AiModule, 
    LibraryModule, 
    TransportModule, 
    BoardingModule, 
    InventoryModule, 
    HealthModule, 
    PublicWebsiteModule, // <-- This module handles its own controller and service
  ],
  // REMOVED: controllers, providers (for PublicWebsite), and exports for PublicWebsite
  providers: [
    // Execution order matters: Auth -> Tenant -> Permissions -> Ownership
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: OwnershipGuard },
    
    // Audit Interceptor
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
     AppGateway,
  ],
})
export class AppModule {}