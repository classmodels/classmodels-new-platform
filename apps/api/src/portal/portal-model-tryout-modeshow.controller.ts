import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, Equals } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { TryoutModeshowService } from './tryout-modeshow.service';

class TryoutInterestDto {
  @IsBoolean()
  interested!: boolean;
}

class TryoutTermsDto {
  @Equals(true)
  accepted!: boolean;
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
    return this.tryout.setInterest(req.user.sub, dto.interested);
  }

  @Post('terms')
  @Permissions('portal.model.briefs.read')
  terms(@Req() req: { user: JwtPayload }, @Body() dto: TryoutTermsDto) {
    return this.tryout.acceptTerms(req.user.sub, dto.accepted);
  }

  @Post('checkout')
  @Permissions('portal.model.briefs.read', 'payments.checkout')
  checkout(@Req() req: { user: JwtPayload }) {
    return this.tryout.startCheckout(req.user.sub);
  }
}
