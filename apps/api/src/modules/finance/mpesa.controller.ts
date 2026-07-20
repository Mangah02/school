// apps/api/src/modules/finance/mpesa.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common'; // ✅ Import Req
import { MpesaService } from './mpesa.service';
import { InitiateStkPushDto } from './dto/initiate-stk-push.dto';
import { MpesaCallbackDto } from './dto/mpesa-callback.dto';
import { Permissions } from '../../core/guards/permissions.decorator';
import { Public } from '../../core/guards/public.decorator';
import { AuditEntity } from '../../core/decorators/audit-entity.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('MPESA')
@Controller('finance/mpesa')
export class MpesaController {
  constructor(private readonly mpesaService: MpesaService) {}

  @Post('stk-push')
  @Permissions('finance:payment:initiate')
  @AuditEntity('Payment')
  async initiateStkPush(@Body() dto: InitiateStkPushDto, @Req() req: any) { // ✅ Use @Req() and type as any
    return this.mpesaService.initiateStkPush(dto, req.user.id);
  }

  @Public() // Safaricom callback cannot have JWT
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(@Body() dto: MpesaCallbackDto) {
    // Safaricom expects a specific JSON response format
    return this.mpesaService.processCallback(dto);
  }
}