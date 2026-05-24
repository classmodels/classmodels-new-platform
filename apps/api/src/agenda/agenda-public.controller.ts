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
import type { Response } from 'express';
import { AgendaService } from './agenda.service';
import { agendaBookFormUploadOptions } from './agenda-book-form-upload';
import { AgendaSlotsQueryDto, BookAgendaDto, CancelAgendaDto, ConfirmAttendanceDto } from './dto/agenda.dto';
import {
  agendaMimeFromFilename,
  agendaUploadFilename,
  resolveAgendaUploadAbsolutePath,
} from './agenda-upload-path';

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

  /** Legacy: oude boekingen met `/uploads/agenda/{uuid}.jpg`. Nieuwe uploads via `/media/public/`. */
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
  @UseInterceptors(AnyFilesInterceptor(agendaBookFormUploadOptions))
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
    const uploaded = await this.agenda.persistBookingUploads(files ?? [], null);
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
