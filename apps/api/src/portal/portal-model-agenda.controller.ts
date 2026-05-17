import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { AgendaService } from '../agenda/agenda.service';
import { resolveMediaRoot } from '../config/resolve-media-root';

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

@Controller('portal/model/agenda')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalModelAgendaController {
  constructor(private agenda: AgendaService) {}

  @Post('book-form')
  @Permissions('portal.model.agenda.book')
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: false,
    }),
  )
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          try {
            const dir = join(resolveMediaRoot(), 'agenda');
            mkdirSync(dir, { recursive: true });
            cb(null, dir);
          } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            cb(err, '');
          }
        },
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname) || ''}`),
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  bookForm(
    @Req() req: { user: JwtPayload },
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const slotId = body.slotId;
    if (!slotId || !isUuid(slotId)) throw new BadRequestException('Ongeldige slotId');
    let fields: Record<string, string> = {};
    if (body.fields) {
      try {
        const parsed = JSON.parse(body.fields) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape');
        fields = parsed as Record<string, string>;
      } catch {
        throw new BadRequestException('Ongeldige velden (JSON)');
      }
    }
    const base = (process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '');
    const uploaded: Record<string, string> = {};
    for (const f of files ?? []) {
      uploaded[f.fieldname] = `${base}/uploads/agenda/${f.filename}`;
    }
    return this.agenda.book({ slotId, fields }, req.user.sub, uploaded);
  }

  @Get(':slug/my-booking')
  @Permissions('portal.model.agenda.read')
  myBooking(@Req() req: { user: JwtPayload }, @Param('slug') slug: string) {
    return this.agenda.getMyBooking(req.user.sub, slug);
  }

  @Post(':slug/cancel-my')
  @Permissions('portal.model.agenda.book')
  cancelMy(@Req() req: { user: JwtPayload }, @Param('slug') slug: string) {
    return this.agenda.cancelMyBooking(req.user.sub, slug);
  }
}
