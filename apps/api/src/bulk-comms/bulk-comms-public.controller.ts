import { Body, Controller, Get, Headers, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { BulkCommsService } from './bulk-comms.service';

/** 1×1 transparante GIF voor open-tracking. */
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

@Controller('bulk-mail')
export class BulkCommsPublicController {
  constructor(private readonly comms: BulkCommsService) {}

  @Get('track/:token.gif')
  async track(
    @Param('token') tokenRaw: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('referer') referer: string | undefined,
    @Res() res: Response,
  ) {
    const token = tokenRaw.replace(/\.gif$/i, '');
    await this.comms.recordEmailOpen(token, {
      userAgent: userAgent?.slice(0, 500) ?? null,
      referer: referer?.slice(0, 500) ?? null,
    });
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(PIXEL);
  }

  @Get('unsubscribe/info')
  unsubscribeInfo(@Query('t') token: string) {
    return this.comms.unsubscribeInfo(token || '');
  }

  @Post('unsubscribe')
  unsubscribe(@Body() body: { token?: string }) {
    return this.comms.unsubscribeByToken(body?.token || '');
  }
}
