import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { MediaService } from '../media/media.service';

@Controller('portal/model/media')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelMediaController {
  constructor(private media: MediaService) {}

  @Get()
  @Permissions('portal.model.media.read')
  list(@Req() req: { user: JwtPayload }) {
    return this.media.listForUploader(req.user.sub);
  }

  @Post('upload')
  @Permissions('portal.model.media.upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: JwtPayload },
    @Query('folderSlug') folderSlug?: string,
  ) {
    if (!file) return { error: 'Geen bestand' };
    return this.media.saveForPortalUser(file, req.user.sub, folderSlug?.trim() || 'models');
  }
}
