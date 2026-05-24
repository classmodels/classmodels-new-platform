import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import type { Response } from 'express';
import sharp from 'sharp';
import { AgendaService } from './agenda.service';
import { AgendaSlotsQueryDto, BookAgendaDto, CancelAgendaDto, ConfirmAttendanceDto } from './dto/agenda.dto';
import { resolveMediaRoot } from '../config/resolve-media-root';
import {
  agendaMimeFromFilename,
  agendaUploadExtFromMimetype,
  agendaUploadFilename,
  agendaUploadRelativeUrl,
  resolveAgendaUploadAbsolutePath,
} from './agenda-upload-path';

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

/** Publieke agenda-API — vergelijkbaar met WP `classmodels-agenda/v1`. */
@Controller('agenda')
export class AgendaPublicController {
  constructor(private agenda: AgendaService) {}

  private async normalizeUploadedImage(file: Express.Multer.File): Promise<Express.Multer.File> {
    const ext = extname(file.filename).toLowerCase();
    if (ext !== '.heic' && ext !== '.heif') return file;
    const out = file.path.replace(/\.(heic|heif)$/i, '.jpg');
    try {
      await sharp(file.path).jpeg({ quality: 88 }).toFile(out);
      try {
        unlinkSync(file.path);
      } catch {
        /**/
      }
    } catch {
      return file;
    }
    try {
      return {
        ...file,
        filename: file.filename.replace(/\.(heic|heif)$/i, '.jpg'),
        originalname: file.originalname.replace(/\.(heic|heif)$/i, '.jpg'),
        path: out,
      };
    } catch {
      return file;
    }
  }

  @Get('calendars')
  calendars() {
    return this.agenda.listActiveCalendars();
  }

  @Get('fields/:slug')
  fields(@Param('slug') slug: string) {
    return this.agenda.getFieldsForSlug(slug);
  }

  /** Publiek: minimale info voor annuleerpagina (geen persoonsgegevens). */
  @Get('cancel-preview')
  cancelPreview(@Query('token') token: string) {
    return this.agenda.getCancelPreviewByToken(token);
  }

  @Get('slots/:slug')
  slots(@Param('slug') slug: string, @Query() q: AgendaSlotsQueryDto) {
    return this.agenda.getSlots(slug, q.from, q.to);
  }

  /** Publiek: agenda-foto (UUID-bestandsnaam) — betrouwbaarder dan static middleware achter proxy. */
  @Get('uploads/:filename')
  serveUpload(@Param('filename') filename: string, @Res() res: Response) {
    const safe = agendaUploadFilename(filename);
    if (!safe) throw new NotFoundException('Bestand niet gevonden');
    const fp = resolveAgendaUploadAbsolutePath(safe);
    if (!fp) throw new NotFoundException('Bestand niet gevonden');
    res.setHeader('Content-Type', agendaMimeFromFilename(safe));
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.sendFile(fp);
  }

  @Post('book')
  book(@Body() dto: BookAgendaDto) {
    /** Gastenportaal: geen login; userId wordt later gekoppeld indien JWT op deze route wordt toegevoegd. */
    return this.agenda.book(dto, null, {});
  }

  /** Multipart: velden `slotId`, `fields` (JSON-string), optioneel bestand(en) per fieldKey (bv. foto). */
  @Post('book-form')
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
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || agendaUploadExtFromMimetype(file.mimetype);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async bookForm(@Body() body: Record<string, string>, @UploadedFiles() files: Express.Multer.File[]) {
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
    const uploaded: Record<string, string> = {};
    for (const raw of files ?? []) {
      const f = await this.normalizeUploadedImage(raw);
      uploaded[f.fieldname] = agendaUploadRelativeUrl(f.filename);
    }
    return this.agenda.book({ slotId, fields }, null, uploaded);
  }

  @Post('cancel')
  cancel(@Body() dto: CancelAgendaDto) {
    return this.agenda.cancelByToken(dto);
  }

  @Post('confirm-attendance')
  confirmAttendance(@Body() dto: ConfirmAttendanceDto) {
    return this.agenda.confirmAttendanceByToken(dto.token);
  }
}
