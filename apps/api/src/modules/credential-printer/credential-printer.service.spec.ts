import { Test, TestingModule } from '@nestjs/testing';
import { CredentialPrinterService } from './credential-printer.service';

describe('CredentialPrinterService', () => {
  let service: CredentialPrinterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CredentialPrinterService],
    }).compile();

    service = module.get<CredentialPrinterService>(CredentialPrinterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
