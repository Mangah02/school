// apps/api/src/modules/exam/exam.controller.ts
import { Controller, Post, Body, Patch, Param, Req } from '@nestjs/common'; // ✅ Import Req
import { ExamService } from './exam.service';
import { EnterMarksDto } from './dto/enter-marks.dto';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { Permissions } from '../../core/guards/permissions.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Exams & Grades')
@Controller('exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post('marks')
  @Permissions('exam:marks:enter')
  @AuditEntity('ExamResult')
  async enterMarks(@Body() dto: EnterMarksDto, @Req() req: any) { // ✅ Use @Req() and type as any
    await this.examService.enterMarks(dto, req.user.id);
    return { success: true, message: 'Marks entered successfully' };
  }

  @Patch(':id/lock')
  @Permissions('exam:lock')
  @AuditEntity('Exam')
  async lockExam(@Param('id') id: string) {
    await this.examService.lockExam(id);
    return { success: true, message: 'Exam locked successfully' };
  }
}