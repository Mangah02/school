// apps/api/src/modules/nemis/nemis.controller.ts
import { Controller, Get, Res, Header } from '@nestjs/common';
import { NemisService } from './nemis.service';
import { Permissions } from '../../core/guards/permissions.decorator';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express'; // ✅ FIX: Use 'import type' for Express Response

@ApiTags('NEMIS Integration')
@Controller('nemis')
export class NemisController {
  constructor(private readonly nemisService: NemisService) {}

  @Get('export/students')
  @Permissions('nemis:export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=nemis_students_export.csv')
  async exportStudents(@Res() res: Response) {
    const csvData = await this.nemisService.generateStudentCsv();
    res.send(csvData);
  }
}