import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AnalyticsService } from './analytics.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminAnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('dashboard')
  @Permissions('admin.agenda.read')
  dashboard(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.getDashboard(from, to);
  }
}
