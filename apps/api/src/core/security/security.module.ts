// apps/api/src/core/security/security.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

@Global() // ✅ Makes EncryptionService available everywhere automatically
@Module({
  imports: [ConfigModule], // ✅ Ensures ConfigService is available to EncryptionService
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class SecurityModule {}