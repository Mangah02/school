import { Module } from '@nestjs/common';
import { ExtraCurricularController } from './extra-curricular.controller';
import { ExtraCurricularService } from './extra-curricular.service';

@Module({
  controllers: [ExtraCurricularController],
  providers: [ExtraCurricularService]
})
export class ExtraCurricularModule {}
