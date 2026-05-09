import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PatchProfileDto } from './dto/patch-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: { user: JwtPayload }) {
    const u = await this.users.findById(req.user.sub);
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      bio: u.bio,
      companyName: u.companyName,
      defaultPortal: u.defaultPortal,
      isPremium: req.user.isPremium,
      roles: req.user.roles,
      permissions: req.user.permissions,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async patchMe(@Req() req: { user: JwtPayload }, @Body() dto: PatchProfileDto) {
    return this.users.patchProfile(req.user.sub, dto);
  }
}
