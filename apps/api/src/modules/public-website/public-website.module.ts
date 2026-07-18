import { Module } from '@nestjs/common';
import { PublicWebsiteController } from './public-website.controller';
import { PublicWebsiteService } from './public-website.service';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicWebsiteController],
  providers: [PublicWebsiteService],
  exports: [PublicWebsiteService],
})
export class PublicWebsiteModule {}
