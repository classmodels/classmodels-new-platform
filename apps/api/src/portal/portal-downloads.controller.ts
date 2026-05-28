import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PortalDownloadsService } from './portal-downloads.service';

@Controller('portal/downloads')
export class PortalDownloadsController {
  constructor(private downloads: PortalDownloadsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('portal.model.media.read')
  @Get()
  listForModel(@Query('section') section?: string) {
    return this.downloads.listForModel(section?.trim() || 'model-portal');
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('portal.model.media.read')
  @Get(':id/file')
  async downloadFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.downloads.streamForModel(id, res);
  }
}

@Controller('admin/portal-downloads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPortalDownloadsController {
  constructor(private downloads: PortalDownloadsService) {}

  @Permissions('admin.media.read')
  @Get()
  list(@Query('section') section?: string) {
    return this.downloads.listAdmin(section?.trim() || 'model-portal');
  }

  @Permissions('admin.media.write')
  @Post()
  create(
    @Body()
    body: {
      label: string;
      mediaAssetId: string;
      section?: string;
      sortOrder?: number;
      active?: boolean;
      availableFrom?: string | null;
    },
  ) {
    return this.downloads.create(body);
  }

  @Permissions('admin.media.write')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: Partial<{
      label: string;
      mediaAssetId: string;
      sortOrder: number;
      active: boolean;
      availableFrom: string | null;
    }>,
  ) {
    return this.downloads.update(id, body);
  }

  @Permissions('admin.media.write')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.downloads.remove(id);
  }
}
