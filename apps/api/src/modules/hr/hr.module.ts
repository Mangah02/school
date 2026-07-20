// apps/api/src/modules/hr/hr.module.ts
import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { PayrollService } from './payroll.service';
import { StaffAttendanceService } from './staff-attendance.service';
import { SecurityModule } from '../../core/security/security.module'; // ✅ Import SecurityModule

@Module({
  imports: [SecurityModule], // ✅ Makes EncryptionService available to HrService
  controllers: [HrController],
  providers: [HrService, PayrollService, StaffAttendanceService],
})
export class HrModule {}