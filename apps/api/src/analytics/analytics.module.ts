import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPublicController } from './analytics-public.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AnalyticsPublicController, AdminAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
