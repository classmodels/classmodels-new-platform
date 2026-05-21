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
import { diskStorage, memoryStorage } from 'multer';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { basename, extname, join } from 'path';
import { resolveMediaRoot } from '../config/resolve-media-root';
import { mediaZipUploadMaxBytes } from './media-zip-import';
import type { Response } from 'express';
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

function zipUploadTmpDir(): string {
  const dir = join(resolveMediaRoot(), '.zip-upload-tmp');
  mkdirSync(dir, { recursive: true });
  return dir;
}

@Controller('media')
export class MediaController {
  constructor(private media: MediaService) {}

  private resolvePublicFile(filename: string): { safe: string; full: string } {
    const safe = basename(filename);
    let full = this.media.resolveAbsolutePathForPublicFilename(safe);
    if (!full && /%[0-9a-fA-F]{2}/.test(filename)) {
      try {
        const dec = basename(decodeURIComponent(filename));
        if (dec && dec !== safe) full = this.media.resolveAbsolutePathForPublicFilename(dec);
      } catch {
        /**/
      }
    }
    if (!safe || safe === '.' || !full) throw new NotFoundException();
    return { safe, full };
  }

  /** Publieke URL voor website/app; alleen bestandsnaam (geen pad-traversal). */
  @Get('public/:filename')
  serve(@Param('filename') filename: string, @Res() res: Response) {
    const { safe, full } = this.resolvePublicFile(filename);
    const mime = PUBLIC_FILE_MIME[extname(safe).toLowerCase()];
    if (mime) res.setHeader('Content-Type', mime);
    /** Range-requests: nodig voor betrouwbare `<video>`-playback (o.a. Safari). */
    return res.sendFile(full, { acceptRanges: true });
  }

  /**
   * Publieke ZIP van een mediamap (bezoekers). Alleen als `publicZipDownload` in mapinstellingen aan staat.
   * Voorbeeld: /__cm_api/media/folder/testshoot/download.zip
   */
  @Get('folder/:slug/download.zip')
  async publicFolderZip(@Param('slug') slug: string, @Res() res: Response) {
    await this.media.streamPublicFolderDownloadZip(slug, res);
  }

  /** Zelfde bestand als /public, maar forceert download (attachment). */
  @Get('download/:filename')
  async serveDownload(@Param('filename') filename: string, @Res() res: Response) {
    const { safe, full } = this.resolvePublicFile(filename);
    const downloadName = await this.media.resolveDownloadFilename(safe);
    const mime = PUBLIC_FILE_MIME[extname(safe).toLowerCase()];
    if (mime) res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
    );
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
  @Permissions('admin.media.read')
  @Get('library/asset-ids')
  libraryAssetIds(@Query('folderId') folderId?: string, @Query('q') q?: string) {
    const fid = folderId?.trim();
    if (!fid) return { error: 'folderId is verplicht' };
    return this.media.listFolderAssetIds(fid, q);
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

  /** ZIP (tot ~6 GB) → als één bestand in gekozen mediamap (niet uitpakken). */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('upload-zip')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, zipUploadTmpDir());
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname) || '.zip'}`);
        },
      }),
      limits: { fileSize: mediaZipUploadMaxBytes() },
      fileFilter: (_req, file, cb) => {
        cb(null, /\.zip$/i.test(file.originalname || ''));
      },
    }),
  )
  uploadZip(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: JwtPayload },
    @Query('folderId') folderId?: string,
  ) {
    if (!file) return { error: 'Geen ZIP-bestand' };
    const fid = folderId?.trim();
    if (!fid) return { error: 'folderId is verplicht' };
    return this.media.importZipUpload(file, req.user.sub, fid);
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
  @Permissions('admin.media.read')
  @Get('admin/storage-info')
  storageInfo() {
    return this.media.getStorageDiagnostics();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('admin/apply-deploy-bundle')
  applyDeployBundle(@Query('force') force?: string) {
    return this.media.applyDeployMediaBundle(force === '1' || force === 'true');
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('register-disk-orphans')
  registerDiskOrphans(
    @Req() req: { user: JwtPayload },
    @Query('folderSlug') folderSlug?: string,
    @Query('limit') limit?: string,
    @Query('dryRun') dryRun?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 200;
    return this.media.registerDiskOrphanAssets(req.user.sub, {
      folderSlug: folderSlug?.trim() || 'models',
      limit: Number.isFinite(lim) ? lim : 200,
      dryRun: dryRun === '1' || dryRun === 'true',
    });
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.write')
  @Post('folders/:folderId/convert-webp-only')
  convertWebpOnly(
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? parseInt(limit, 10) : 200;
    return this.media.reconcileFolderWebpOnly(folderId, Number.isFinite(n) ? n : 200);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admin.media.read')
  @Get('folders/:folderId/download.zip')
  async folderDownloadZip(
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Res() res: Response,
  ) {
    await this.media.streamFolderDownloadZip(folderId, res);
  }
}
