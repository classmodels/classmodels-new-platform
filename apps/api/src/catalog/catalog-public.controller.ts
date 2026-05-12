import { Controller, Get, Headers } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getJwtSecret } from '../auth/jwt-module-options';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogPublicController {
  constructor(
    private catalog: CatalogService,
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

  /** Publiek modellenrooster (+ admin-velden als Bearer admin). */
  @Get('models')
  async models(@Headers('authorization') authorization?: string) {
    const u = this.parseUser(authorization);
    return this.catalog.listModels(
      u ? { sub: u.sub, roles: u.roles ?? [] } : undefined,
    );
  }
}
