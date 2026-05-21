import { Controller, Get, Header, Headers, Param, ParseUUIDPipe } from '@nestjs/common';
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
  @Header('Cache-Control', 'private, max-age=30')
  async models(@Headers('authorization') authorization?: string) {
    const u = this.parseUser(authorization);
    return this.catalog.listModels(
      u ? { sub: u.sub, roles: u.roles ?? [] } : undefined,
    );
  }

  @Get('models/:id')
  async modelDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ) {
    const u = this.parseUser(authorization);
    return this.catalog.getModelDetail(id, u ? { sub: u.sub, roles: u.roles ?? [] } : undefined);
  }

  @Get('models/:id/gallery')
  async modelGallery(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization?: string,
  ) {
    const u = this.parseUser(authorization);
    return this.catalog.getModelGallery(id, u ? { sub: u.sub, roles: u.roles ?? [] } : undefined);
  }
}
