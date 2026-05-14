import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService, pickPublicMediaKey } from './users.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PatchProfileDto } from './dto/patch-profile.dto';
import { ModelPushService } from '../push/model-push.service';
import { premiumEffective } from '../auth/permissions.util';

@Controller('users')
export class UsersController {
  constructor(
    private users: UsersService,
    private modelPush: ModelPushService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: { user: JwtPayload }) {
    const u = await this.users.findById(req.user.sub);
    if (!u) return null;
    const push = await this.modelPush.getSummaryForUser(req.user.sub);
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      bio: u.bio,
      companyName: u.companyName,
      defaultPortal: u.defaultPortal,
      modelSheet: u.modelSheet ?? null,
      profilePhotoAssetId: u.profilePhotoAssetId ?? null,
      profileThumbKey: pickPublicMediaKey(u.profilePhoto ?? null),
      isPremium: premiumEffective(u),
      premiumUntil: u.premiumUntil?.toISOString() ?? null,
      roles: req.user.roles,
      permissions: req.user.permissions,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      push,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async patchMe(@Req() req: { user: JwtPayload }, @Body() dto: PatchProfileDto) {
    return this.users.patchProfile(req.user.sub, dto);
  }
}
