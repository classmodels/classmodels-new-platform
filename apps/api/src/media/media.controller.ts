import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
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
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: JwtPayload },
    @Query('folderId') folderId?: string,
  ) {
    if (!file) return { error: 'Geen bestand' };
    return this.media.saveFile(file, req.user.sub, folderId);
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
}
