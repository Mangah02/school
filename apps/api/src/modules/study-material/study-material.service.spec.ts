import { Test, TestingModule } from '@nestjs/testing';
import { StudyMaterialService } from './study-material.service';

describe('StudyMaterialService', () => {
  let service: StudyMaterialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudyMaterialService],
    }).compile();

    service = module.get<StudyMaterialService>(StudyMaterialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
