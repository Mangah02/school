// apps/api/src/modules/finance/journal.controller.ts
import { Controller, Post, Body, Req } from '@nestjs/common'; // ✅ Import Req
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
  async reverse(@Body() dto: ReverseTransactionDto, @Req() req: any) { // ✅ Use @Req() and type as any
    return this.journalService.reverseTransaction(dto, req.user.id);
  }
}