import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { MediaService } from '../media/media.service';

@Controller('portal/model/modeshow-downloads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelModeshowDownloadsController {
  constructor(private media: MediaService) {}

  @Get()
  @Permissions('portal.model.media.read')
  meta() {
    return this.media.getModeshowDownloadsMeta();
  }

  @Get('photos.zip')
  @Permissions('portal.model.media.read')
  async photosZip(@Req() req: { user: JwtPayload }, @Res({ passthrough: false }) res: Response) {
    await this.media.streamModeshowPhotosZip(req.user.sub, res);
  }

  @Get('film')
  @Permissions('portal.model.media.read')
  async film(@Req() req: { user: JwtPayload }, @Res({ passthrough: false }) res: Response) {
    await this.media.streamModeshowFilm(req.user.sub, res);
  }
}
