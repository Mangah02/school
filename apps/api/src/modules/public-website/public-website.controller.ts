// apps/api/src/modules/public/public.controller.ts
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PublicWebsiteService } from './public-website.service';
import { Public } from '../../core/guards/public.decorator';
import { Permissions } from '../../core/guards/permissions.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Public Website')
@Controller('public-website') // Or keep it as 'public' in the route if you prefer the URL to be /public/...
export class PublicWebsiteController {
  constructor(private readonly publicWebsiteService: PublicWebsiteService) {}

  @Public()
  @Get(':schoolId/announcements')
  async getAnnouncements(@Param('schoolId') schoolId: string) {
    return this.publicWebsiteService.getActiveAnnouncements(schoolId);
  }

  @Public()
  @Post(':schoolId/contact')
  async submitContactForm(
    @Param('schoolId') schoolId: string,
    @Body() body: { name: string, email: string, phone?: string, subject: string, message: string }
  ) {
    return this.publicWebsiteService.submitContactForm(schoolId, body);
  }

  @Post('contact/:id/status')
  @Permissions('public:contact:manage')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string, admin_notes?: string },
    @Query('school_id') schoolId: string
  ) {
    return this.publicWebsiteService.updateSubmissionStatus(id, schoolId, body.status, body.admin_notes);
  }
}