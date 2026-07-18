import { Test, TestingModule } from '@nestjs/testing';
import { PublicWebsiteController } from './public-website.controller';

describe('PublicWebsiteController', () => {
  let controller: PublicWebsiteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicWebsiteController],
    }).compile();

    controller = module.get<PublicWebsiteController>(PublicWebsiteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
