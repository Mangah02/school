// apps/api/src/modules/finance/journal.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { JournalService } from './journal.service';
import { ReverseTransactionDto } from './dto/journal-correction.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Finance - Journals')
@Controller('finance/journals')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post('reverse')
  @Permissions('finance:journal:correct') // Strict permission for corrections
  @AuditEntity('JournalEntry')
  async reverse(@Body() dto: ReverseTransactionDto, @Request() req) {
    return this.journalService.reverseTransaction(dto, req.user.id);
  }
}