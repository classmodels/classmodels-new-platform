import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { RecordPageViewDto } from './dto/page-view.dto';

@Controller('analytics')
export class AnalyticsPublicController {
  constructor(private analytics: AnalyticsService) {}

  @Post('pageview')
  pageview(@Body() dto: RecordPageViewDto, @Req() req: Request) {
    return this.analytics.recordPageView({
      path: dto.path,
      sessionId: dto.sessionId,
      userId: dto.userId,
      referrer: dto.referrer ?? req.headers.referer?.toString(),
    });
  }
}
