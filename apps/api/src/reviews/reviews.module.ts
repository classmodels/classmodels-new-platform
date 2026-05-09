import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewsService } from './reviews.service';
import { ReviewsPublicController } from './reviews-public.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsPublicController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
