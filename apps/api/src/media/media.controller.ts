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
import { basename, extname, join } from 'path';
import { existsSync } from 'fs';
import {
  CreateMediaFolderDto,
  MoveAssetsFolderDto,
  MoveToTrashDto,
  UpdateFolderSettingsDto,
} from './dto/media-admin.dto';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';

/** Juiste Content-Type voor publieke bestanden (HTML5 video vereist o.a. video/mp4). */
const PUBLIC_FILE_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
};

@Controller('media')
export class MediaController {
  constructor(private media: MediaService) {}

  /** Publieke URL voor website/app; alleen bestandsnaam (geen pad-traversal). */
  @Get('public/:filename')
  serve(@Param('filename') filename: string, @Res() res: Response) {
    const safe = basename(filename);
    const full = join(this.media.root(), safe);
    if (!safe || safe === '.' || !existsSync(full)) throw new NotFoundException();
    const mime = PUBLIC_FILE_MIME[extname(safe).toLowerCase()];
    if (mime) res.setHeader('Content-Type', mime);
    /** Range-requests: nodig voor betrouwbare `<video>`-playback (o.a. Safari). */
    return res.sendFile(full, { acceptRanges: true });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.read')
  @Get('library')
  library(
    @Query('legacy') legacy?: string,
    @Query('folderId') folderId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (legacy === '1' || legacy === 'true') {
      return this.media.libraryLegacy();
    }
    const p = page ? parseInt(page, 10) : 1;
    const ps = pageSize ? parseInt(pageSize, 10) : 72;
    return this.media.libraryPaginated(
      folderId,
      Number.isFinite(p) ? p : 1,
      Number.isFinite(ps) ? ps : 72,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('folders/ensure-defaults')
  ensureFolders() {
    return this.media.ensureDefaultFolders();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('folders')
  createFolder(@Body() body: CreateMediaFolderDto) {
    return this.media.createFolder(body.label);
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

  /** Herstel: zelfde bestandsnaam als in DB, geen nieuw mediarecord. */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('sync-disk-file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  syncDiskFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('filename') filename?: string,
  ) {
    if (!file) return { error: 'Geen bestand' };
    const name = filename?.trim() || file.originalname;
    return this.media.putDiskFile(file, name);
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

  @Permissions('admin.media.write')
  @Post('assets/move-folder')
  moveFolder(@Body() body: MoveAssetsFolderDto) {
    return this.media.moveAssetsToFolder(body.ids, body.folderId);
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
