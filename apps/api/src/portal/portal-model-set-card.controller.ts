import { Body, Controller, Get, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ModelSetCardService } from './model-set-card.service';

export type PortalSaveSetCardBody = {
  frontHeroAssetId?: string | null;
  /** Precies 5 slots (`assetId` of `null`), raster voor PDF */
  versoPhotoAssetIds?: (string | null)[] | unknown;
  noteFromModel?: string | null;
};

@Controller('portal/model/set-card')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelSetCardController {
  constructor(private readonly setCard: ModelSetCardService) {}

  @Get()
  @Permissions('portal.model.media.read')
  getDraft(@Req() req: { user: JwtPayload }) {
    return this.setCard.getDraft(req.user.sub);
  }

  @Put()
  @Permissions('portal.model.media.upload')
  saveDraft(@Req() req: { user: JwtPayload }, @Body() body: PortalSaveSetCardBody) {
    return this.setCard.saveDraft(req.user.sub, body);
  }

  @Get('preview.pdf')
  @Permissions('portal.model.media.read')
  async previewPdf(@Req() req: { user: JwtPayload }, @Res({ passthrough: false }) res: Response) {
    const pdf = await this.setCard.previewPdf(req.user.sub);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="setkaart-preview.pdf"');
    res.send(Buffer.from(pdf));
  }

  @Post('submit')
  @Permissions('portal.model.media.upload')
  submit(@Req() req: { user: JwtPayload }) {
    return this.setCard.submit(req.user.sub);
  }
}
