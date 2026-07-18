import { Test, TestingModule } from '@nestjs/testing';
import { CbtController } from './cbt.controller';

describe('CbtController', () => {
  let controller: CbtController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CbtController],
    }).compile();

    controller = module.get<CbtController>(CbtController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
