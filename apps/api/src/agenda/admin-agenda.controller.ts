import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AgendaService } from './agenda.service';
import {
  AdminBookingsQueryDto,
  AdminBookingsRangeQueryDto,
  AdminCalendarMonthQueryDto,
  AdminClosedDaysQueryDto,
  AdminOpenDaysQueryDto,
  AdminSlotsQueryDto,
  BulkAgendaSlotsDto,
  CreateAgendaCalendarDto,
  CreateAgendaSlotDto,
  CreateClosedDayDto,
  CreateOpenDayDto,
  UpdateAdminBookingDto,
  UpdateAgendaCalendarDto,
} from './dto/agenda.dto';

@Controller('admin/agenda')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminAgendaController {
  constructor(private agenda: AgendaService) {}

  @Get('overview')
  @Permissions('admin.agenda.read')
  overview() {
    return this.agenda.adminOverview();
  }

  /** HTML-voorbeeld van de bevestigingsmail (open in browser). */
  @Get('notifications/preview/booking-confirmation')
  @Permissions('admin.agenda.read')
  @Header('Content-Type', 'text/html; charset=utf-8')
  previewBookingConfirmationMail() {
    return this.agenda.previewBookingConfirmationHtml();
  }

  @Get('calendars')
  @Permissions('admin.agenda.read')
  calendars() {
    return this.agenda.adminListCalendars();
  }

  @Post('calendars')
  @Permissions('admin.agenda.write')
  createCalendar(@Body() dto: CreateAgendaCalendarDto) {
    return this.agenda.adminCreateCalendar(dto);
  }

  @Patch('calendars/:id')
  @Permissions('admin.agenda.write')
  patchCalendar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAgendaCalendarDto) {
    return this.agenda.adminUpdateCalendar(id, dto);
  }

  @Get('bookings')
  @Permissions('admin.agenda.read')
  bookings(@Query() q: AdminBookingsQueryDto) {
    return this.agenda.adminListBookings(q.calendarSlug, q.limit ?? 100);
  }

  @Get('bookings-range')
  @Permissions('admin.agenda.read')
  bookingsRange(@Query() q: AdminBookingsRangeQueryDto) {
    return this.agenda.adminBookingsRange(q);
  }

  @Get('bookings/:id')
  @Permissions('admin.agenda.read')
  getBooking(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenda.adminGetBooking(id);
  }

  @Patch('bookings/:id')
  @Permissions('admin.agenda.write')
  patchBooking(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminBookingDto) {
    return this.agenda.adminPatchBooking(id, dto);
  }

  @Delete('bookings/:id')
  @Permissions('admin.agenda.write')
  deleteBooking(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenda.adminDeleteBooking(id);
  }

  @Get('slots')
  @Permissions('admin.agenda.read')
  listSlots(@Query() q: AdminSlotsQueryDto) {
    return this.agenda.adminListSlots(q);
  }

  @Post('slots/bulk')
  @Permissions('admin.agenda.write')
  bulkSlots(@Body() dto: BulkAgendaSlotsDto) {
    return this.agenda.adminBulkCreateSlots(dto);
  }

  @Post('slots')
  @Permissions('admin.agenda.write')
  createSlot(@Body() dto: CreateAgendaSlotDto) {
    return this.agenda.adminCreateSlot(dto);
  }

  @Delete('slots/:slotId')
  @Permissions('admin.agenda.write')
  deleteSlot(@Param('slotId', ParseUUIDPipe) slotId: string) {
    return this.agenda.adminDeleteSlot(slotId);
  }

  @Get('open-days')
  @Permissions('admin.agenda.read')
  openDays(@Query() q: AdminOpenDaysQueryDto) {
    return this.agenda.adminListOpenDays(q);
  }

  @Post('open-days')
  @Permissions('admin.agenda.write')
  addOpenDay(@Body() dto: CreateOpenDayDto) {
    return this.agenda.adminAddOpenDay(dto);
  }

  @Delete('open-days/:id')
  @Permissions('admin.agenda.write')
  removeOpenDay(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenda.adminRemoveOpenDay(id);
  }

  @Get('closed-days')
  @Permissions('admin.agenda.read')
  closedDays(@Query() q: AdminClosedDaysQueryDto) {
    return this.agenda.adminListClosedDays(q.calendarId);
  }

  @Post('closed-days')
  @Permissions('admin.agenda.write')
  addClosedDay(@Body() dto: CreateClosedDayDto) {
    return this.agenda.adminAddClosedDay(dto);
  }

  @Delete('closed-days/:id')
  @Permissions('admin.agenda.write')
  removeClosedDay(@Param('id', ParseUUIDPipe) id: string) {
    return this.agenda.adminRemoveClosedDay(id);
  }

  @Get('calendar-month')
  @Permissions('admin.agenda.read')
  calendarMonth(@Query() q: AdminCalendarMonthQueryDto) {
    return this.agenda.adminCalendarMonth(q);
  }
}
