import { Module } from '@nestjs/common';
import { CredentialPrinterController } from './credential-printer.controller';
import { CredentialPrinterService } from './credential-printer.service';

@Module({
  controllers: [CredentialPrinterController],
  providers: [CredentialPrinterService]
})
export class CredentialPrinterModule {}
