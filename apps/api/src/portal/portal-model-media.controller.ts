import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { DownloadAckDto } from '../media/dto/media-admin.dto';
import { MediaService } from '../media/media.service';

@Controller('portal/model/media')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelMediaController {
  constructor(private media: MediaService) {}

  @Get()
  @Permissions('portal.model.media.read')
  list(@Req() req: { user: JwtPayload }) {
    return this.media.listForUploader(req.user.sub);
  }

  @Post('download-ack')
  @Permissions('portal.model.media.read')
  downloadAck(@Req() req: { user: JwtPayload }, @Body() body: DownloadAckDto) {
    return this.media.modelAckPortfolioDownload(req.user.sub, body.assetId);
  }

  @Get('portfolio-delivery/count')
  @Permissions('portal.model.media.read')
  async portfolioDeliveryCount(@Req() req: { user: JwtPayload }) {
    const n = await this.media.countPortfolioDeliveryForModel(req.user.sub);
    return { count: n };
  }

  @Get('portfolio-delivery/zip')
  @Permissions('portal.model.media.read')
  async portfolioDeliveryZip(@Req() req: { user: JwtPayload }, @Res({ passthrough: false }) res: Response) {
    await this.media.streamPortfolioDeliveryZipAndConsume(req.user.sub, res);
  }

  @Delete(':id')
  @Permissions('portal.model.media.upload')
  deleteOwn(@Req() req: { user: JwtPayload }, @Param('id', ParseUUIDPipe) id: string) {
    return this.media.modelDeleteOwnAsset(req.user.sub, id);
  }

  @Post('upload')
  @Permissions('portal.model.media.upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: JwtPayload },
    @Query('folderSlug') folderSlug?: string,
  ) {
    if (!file) return { error: 'Geen bestand' };
    const slug = folderSlug?.trim() || 'models';
    const allowed = ['models', 'tijdelijke-uploads', 'setkaarten'];
    if (!allowed.includes(slug)) {
      return { error: `Alleen ${allowed.join(' of ')} is toegestaan voor model-uploads.` };
    }
    return this.media.saveForPortalUser(file, req.user.sub, slug);
  }
}
