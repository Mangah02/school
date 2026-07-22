// apps/api/src/modules/guardian/guardian.module.ts
import { Module } from '@nestjs/common';
import { GuardianController } from './guardian.controller';
import { GuardianService } from './guardian.service';

@Module({
  controllers: [GuardianController],
  providers: [GuardianService],
})
export class GuardianModule {}