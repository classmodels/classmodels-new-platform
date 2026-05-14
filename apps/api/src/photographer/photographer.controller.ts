import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
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
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PhotographerService } from './photographer.service';

const PHOTOGRAPHER_TMP = join(process.cwd(), 'uploads', 'photographer-tmp');

function photographerUploadMaxBytes(): number {
  const raw = process.env.PHOTOGRAPHER_UPLOAD_MAX_BYTES;
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return Math.min(n, 4 * 1024 * 1024 * 1024);
  }
  /** Standaard 500 MB per bestand; verhoog via env (tot 4 GB) voor grote RAW. Reverse proxy timeouts aanpassen. */
  return 500 * 1024 * 1024;
}

@Controller('photographer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PhotographerController {
  constructor(private photographer: PhotographerService) {}

  @Get('portfolio-bookings')
  @Permissions('photographer.portfolio.upload')
  portfolioBookings() {
    return this.photographer.listPortfolioBookings();
  }

  @Post('upload')
  @Permissions('photographer.portfolio.upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(PHOTOGRAPHER_TMP, { recursive: true });
          cb(null, PHOTOGRAPHER_TMP);
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname) || ''}`);
        },
      }),
      limits: { fileSize: photographerUploadMaxBytes() },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: JwtPayload },
    @Query('folderSlug') folderSlug?: string,
    @Query('modelUserId') modelUserId?: string,
  ) {
    if (!file) return { error: 'Geen bestand' };
    const slug = (folderSlug || 'portfolio-fotograaf').trim();
    return this.photographer.upload(file, req.user.sub, slug, modelUserId?.trim() || undefined);
  }
}
