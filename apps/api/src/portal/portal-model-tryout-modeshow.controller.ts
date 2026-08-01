import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Equals, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { TryoutModeshowService } from './tryout-modeshow.service';

class TryoutInterestDto {
  @IsBoolean()
  interested!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  declineReason?: string;
}

class TryoutTermsDto {
  @Equals(true)
  accepted!: boolean;
}

class TryoutCheckoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  returnOrigin?: string;
}

class TryoutCouponPreviewDto {
  @IsString()
  @MaxLength(40)
  couponCode!: string;
}

@Controller('portal/model/tryout-modeshow')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelTryoutModeshowController {
  constructor(private tryout: TryoutModeshowService) {}

  @Get()
  @Permissions('portal.model.briefs.read')
  state(@Req() req: { user: JwtPayload }) {
    return this.tryout.getState(req.user.sub);
  }

  @Post('interest')
  @Permissions('portal.model.briefs.read')
  interest(@Req() req: { user: JwtPayload }, @Body() dto: TryoutInterestDto) {
    return this.tryout.setInterest(req.user.sub, dto.interested, dto.declineReason);
  }

  @Post('terms')
  @Permissions('portal.model.briefs.read')
  terms(@Req() req: { user: JwtPayload }, @Body() dto: TryoutTermsDto) {
    return this.tryout.acceptTerms(req.user.sub, dto.accepted);
  }

  @Post('coupon-preview')
  @Permissions('portal.model.briefs.read')
  couponPreview(@Req() req: { user: JwtPayload }, @Body() dto: TryoutCouponPreviewDto) {
    return this.tryout.previewCoupon(req.user.sub, dto.couponCode);
  }

  @Post('checkout')
  @Permissions('portal.model.briefs.read', 'payments.checkout')
  checkout(
    @Req() req: { user: JwtPayload; headers: { authorization?: string } },
    @Body() dto: TryoutCheckoutDto,
  ) {
    const resumeToken = bearerToken(req.headers.authorization);
    return this.tryout.startCheckout(req.user.sub, dto.couponCode, {
      returnOrigin: dto.returnOrigin,
      resumeToken,
    });
  }
}

function bearerToken(authorization?: string): string | null {
  const raw = authorization?.trim();
  if (!raw) return null;
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m?.[1]?.trim() || null;
}
