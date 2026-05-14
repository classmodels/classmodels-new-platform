import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PhotographerController } from './photographer.controller';
import { PhotographerService } from './photographer.service';

@Module({
  imports: [AuthModule, PrismaModule, MediaModule],
  controllers: [PhotographerController],
  providers: [PhotographerService],
})
export class PhotographerModule {}
