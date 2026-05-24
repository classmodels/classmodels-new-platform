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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { AgendaService } from '../agenda/agenda.service';
import { agendaBookFormUploadOptions } from '../agenda/agenda-book-form-upload';

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
  @UseInterceptors(AnyFilesInterceptor(agendaBookFormUploadOptions))
  async bookForm(
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
    const uploaded = await this.agenda.persistBookingUploads(files ?? [], req.user.sub);
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
