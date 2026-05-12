import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CatalogService } from './catalog.service';

@Controller('admin/catalog')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CatalogAdminController {
  constructor(private catalog: CatalogService) {}

  @Post('models/:modelId/favorite')
  @Permissions('admin.users.write')
  toggleFavorite(@Req() req: { user: JwtPayload }, @Param('modelId', ParseUUIDPipe) modelId: string) {
    return this.catalog.toggleFavorite(req.user.sub, req.user.roles ?? [], modelId);
  }

  @Post('models/:modelId/flags')
  @Permissions('admin.users.write')
  setFlags(
    @Req() req: { user: JwtPayload },
    @Param('modelId', ParseUUIDPipe) modelId: string,
    @Body() body: { inactive?: boolean; newface?: boolean; tryout?: boolean },
  ) {
    return this.catalog.setModelFlags(req.user.sub, req.user.roles ?? [], modelId, body);
  }
}
