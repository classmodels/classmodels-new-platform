import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { basename, join } from 'path';
import { existsSync } from 'fs';
import { MoveToTrashDto, UpdateFolderSettingsDto } from './dto/media-admin.dto';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';

@Controller('media')
export class MediaController {
  constructor(private media: MediaService) {}

  /** Publieke URL voor website/app; alleen bestandsnaam (geen pad-traversal). */
  @Get('public/:filename')
  serve(@Param('filename') filename: string, @Res() res: Response) {
    const safe = basename(filename);
    const full = join(this.media.root(), safe);
    if (!safe || safe === '.' || !existsSync(full)) throw new NotFoundException();
    return res.sendFile(full);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.read')
  @Get('library')
  library() {
    return this.media.library();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('folders/ensure-defaults')
  ensureFolders() {
    return this.media.ensureDefaultFolders();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.read')
  @Get()
  list() {
    return this.media.list();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      /** Ruimer voor admin-video’s (foto’s blijven klein; video tot ~200 MB). */
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: JwtPayload },
    @Query('folderId') folderId?: string,
    @Query('fileLabel') fileLabel?: string,
  ) {
    if (!file) return { error: 'Geen bestand' };
    const label = fileLabel?.trim();
    return this.media.saveFile(file, req.user.sub, folderId, label ? { fileLabel: label } : undefined);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Delete('assets/:id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hard') hard?: string,
  ) {
    return this.media.removeAsset(id, hard === '1' || hard === 'true');
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('assets/move-trash')
  moveToTrash(@Body() body: MoveToTrashDto) {
    return this.media.moveAssetsToTrash(body.ids);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('trash/empty')
  emptyTrash() {
    return this.media.emptyTrash();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Patch('folders/:folderId/settings')
  patchFolderSettings(
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() body: UpdateFolderSettingsDto,
  ) {
    return this.media.updateFolderSettings(folderId, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('folders/:folderId/reoptimize-images')
  reoptimizeImages(
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? parseInt(limit, 10) : 40;
    return this.media.reoptimizeFolderImages(folderId, Number.isFinite(n) ? n : 40);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('folders/:folderId/convert-primary-to-jpeg')
  convertPrimaryToJpeg(
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? parseInt(limit, 10) : 40;
    return this.media.convertFolderPrimaryToJpeg(folderId, Number.isFinite(n) ? n : 40);
  }
}
