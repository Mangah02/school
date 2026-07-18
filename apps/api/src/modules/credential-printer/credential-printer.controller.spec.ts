import { Test, TestingModule } from '@nestjs/testing';
import { CredentialPrinterController } from './credential-printer.controller';

describe('CredentialPrinterController', () => {
  let controller: CredentialPrinterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CredentialPrinterController],
    }).compile();

    controller = module.get<CredentialPrinterController>(CredentialPrinterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
