import { Test, TestingModule } from '@nestjs/testing';
import { CbtService } from './cbt.service';

describe('CbtService', () => {
  let service: CbtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CbtService],
    }).compile();

    service = module.get<CbtService>(CbtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
