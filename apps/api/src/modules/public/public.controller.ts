// apps/api/src/modules/public/public.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PublicService } from './public.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../core/decorators/public.decorator';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Post('admissions/apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a public admission application' })
  async applyForAdmission(@Body() data: any) {
    return this.publicService.createApplication(data);
  }
}