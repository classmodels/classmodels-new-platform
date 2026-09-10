import {
  Body,
  Controller,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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

  /** Download klantveilige A4-PDF (één of meer fiches). */
  @Post('model-sheets/pdf')
  @Permissions('admin.users.write')
  @Header('Content-Type', 'application/pdf')
  async modelSheetsPdf(
    @Req() req: { user: JwtPayload },
    @Body() body: { modelIds?: string[] },
    @Res({ passthrough: true }) res: Response,
  ) {
    const pdf = await this.catalog.buildClientSheetsPdf(
      req.user.sub,
      req.user.roles ?? [],
      body?.modelIds ?? [],
    );
    const n = (body?.modelIds ?? []).length;
    const filename =
      n === 1 ? 'class-models-fiche.pdf' : `class-models-fiches-${Math.max(1, n)}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(pdf);
  }

  /** Mail klantveilige A4-PDF als bijlage via SMTP. */
  @Post('model-sheets/email')
  @Permissions('admin.users.write')
  emailModelSheets(
    @Req() req: { user: JwtPayload },
    @Body() body: { modelIds?: string[]; to?: string },
  ) {
    return this.catalog.emailClientSheetsPdf(
      req.user.sub,
      req.user.roles ?? [],
      body?.modelIds ?? [],
      body?.to ?? '',
    );
  }
}
