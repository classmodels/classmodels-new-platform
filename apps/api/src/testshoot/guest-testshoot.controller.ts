import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { TestshootService } from './testshoot.service';
import { TestshootFeedbackDto } from './dto/testshoot-feedback.dto';

@Controller('guest/testshoot')
export class GuestTestshootController {
  constructor(private readonly testshoot: TestshootService) {}

  @Get()
  list() {
    return this.testshoot.listPublic();
  }

  /** Als `downloadUnlocked`: krijg tijdelijke zip-handtekening (anders 403 NEED_FEEDBACK). */
  @Post('models/:modelId/download-intent')
  downloadIntent(@Param('modelId', ParseUUIDPipe) modelId: string) {
    return this.testshoot.requestDownloadToken(modelId);
  }

  @Post('models/:modelId/feedback')
  async feedback(
    @Param('modelId', ParseUUIDPipe) modelId: string,
    @Body() dto: TestshootFeedbackDto,
    @Ip() ip: string,
  ) {
    const { exp, sig } = await this.testshoot.submitFeedback(modelId, dto, ip);
    return { modelId, exp, sig };
  }

  @Get('models/:modelId/zip')
  async zip(
    @Param('modelId', ParseUUIDPipe) modelId: string,
    @Query('e', ParseIntPipe) exp: number,
    @Query('s') sig: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    await this.testshoot.streamZipToResponse(modelId, exp, sig, res);
  }
}
