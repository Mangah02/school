import { Test, TestingModule } from '@nestjs/testing';
import { PublicWebsiteService } from './public-website.service';

describe('PublicWebsiteService', () => {
  let service: PublicWebsiteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicWebsiteService],
    }).compile();

    service = module.get<PublicWebsiteService>(PublicWebsiteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
