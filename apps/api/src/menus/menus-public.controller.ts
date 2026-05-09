import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Portal } from '@prisma/client';
import { getJwtSecret } from '../auth/jwt-module-options';
import { MenusService } from './menus.service';
import type { JwtPayload } from '../auth/jwt.strategy';

const PORTALS: Portal[] = ['guest', 'model', 'client'];

function isPortal(s: string): s is Portal {
  return PORTALS.includes(s as Portal);
}

@Controller('menus')
export class MenusPublicController {
  constructor(
    private menus: MenusService,
    private jwt: JwtService,
  ) {}

  private parseUser(authorization?: string): JwtPayload | undefined {
    if (!authorization?.startsWith('Bearer ')) return undefined;
    try {
      return this.jwt.verify<JwtPayload>(authorization.slice(7), {
        secret: getJwtSecret(),
      });
    } catch {
      return undefined;
    }
  }

  /**
   * Publiek menu voor website. Optioneel: Authorization Bearer voor premium/rol-filter.
   * Query: placement=top|left|middle|hidden
   */
  @Get('for/:portal')
  async forPortal(
    @Param('portal') portalRaw: string,
    @Query('placement') placement: string | undefined,
    @Headers('authorization') authorization?: string,
  ) {
    if (!isPortal(portalRaw)) return [];
    const user = this.parseUser(authorization);
    const ctx = {
      isPremium: user?.roles?.includes('admin') ? true : !!user?.isPremium,
      roleSlugs: user?.roles?.length ? user.roles : [],
    };
    return this.menus.forPortal(portalRaw, placement, ctx);
  }
}
