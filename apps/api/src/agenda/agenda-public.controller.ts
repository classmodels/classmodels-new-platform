import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { AgendaService } from './agenda.service';
import { AgendaSlotsQueryDto, BookAgendaDto, CancelAgendaDto, ConfirmAttendanceDto } from './dto/agenda.dto';
import { resolveWritableMediaRoot } from '../config/resolve-media-root';
import { agendaUploadRelativeUrl } from './agenda-upload-path';

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

/** Publieke agenda-API — vergelijkbaar met WP `classmodels-agenda/v1`. */
@Controller('agenda')
export class AgendaPublicController {
  constructor(private agenda: AgendaService) {}

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
            const dir = join(resolveWritableMediaRoot(), 'agenda');
            mkdirSync(dir, { recursive: true });
            cb(null, dir);
          } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            cb(err, '');
          }
        },
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname) || ''}`),
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  bookForm(@Body() body: Record<string, string>, @UploadedFiles() files: Express.Multer.File[]) {
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
    for (const f of files ?? []) {
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
