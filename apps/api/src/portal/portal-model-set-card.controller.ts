import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
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

class SetCardCheckoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  returnOrigin?: string;
}

function bearerToken(authorization?: string): string | null {
  const raw = authorization?.trim();
  if (!raw) return null;
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m?.[1]?.trim() || null;
}

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
    const isAdmin = req.user.roles?.includes('admin') ?? false;
    return this.setCard.saveDraft(req.user.sub, body, { allowEditAfterSubmit: isAdmin });
  }

  @Post('checkout')
  @Permissions('portal.model.media.upload', 'payments.checkout')
  checkout(
    @Req() req: { user: JwtPayload; headers: { authorization?: string } },
    @Body() dto: SetCardCheckoutDto,
  ) {
    return this.setCard.startCheckout(req.user.sub, {
      returnOrigin: dto.returnOrigin,
      resumeToken: bearerToken(req.headers.authorization),
    });
  }

  @Post('submit')
  @Permissions('portal.model.media.upload')
  submit(@Req() req: { user: JwtPayload }) {
    const isAdmin = req.user.roles?.includes('admin') ?? false;
    return this.setCard.submit(req.user.sub, { allowResubmit: isAdmin });
  }
}
