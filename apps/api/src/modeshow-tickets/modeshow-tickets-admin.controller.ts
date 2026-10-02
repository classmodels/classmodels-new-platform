import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ModeshowTicketsService } from './modeshow-tickets.service';

@Controller('admin/modeshow-tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModeshowTicketsAdminController {
  constructor(private tickets: ModeshowTicketsService) {}

  @Get('events')
  @Permissions('admin.billing.read')
  listEvents() {
    return this.tickets.adminListEvents();
  }

  @Get('events/:id')
  @Permissions('admin.billing.read')
  getEvent(@Param('id') id: string) {
    return this.tickets.adminGetEvent(id);
  }

  @Post('events')
  @Permissions('admin.billing.write')
  createEvent(@Body() body: Record<string, unknown>) {
    return this.tickets.adminCreateEvent(body);
  }

  @Patch('events/:id')
  @Permissions('admin.billing.write')
  updateEvent(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.tickets.adminUpdateEvent(id, body);
  }

  @Post('events/:id/coupons')
  @Permissions('admin.billing.write')
  upsertCoupon(
    @Param('id') id: string,
    @Body() body: { code: string; ticketType: string; maxQty?: number; active?: boolean; id?: string },
  ) {
    return this.tickets.adminUpsertCoupon(id, body);
  }

  @Delete('events/:eventId/coupons/:couponId')
  @Permissions('admin.billing.write')
  deleteCoupon(@Param('eventId') eventId: string, @Param('couponId') couponId: string) {
    return this.tickets.adminDeleteCoupon(eventId, couponId);
  }

  @Get('orders')
  @Permissions('admin.billing.read')
  listOrders(
    @Query('eventId') eventId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.tickets.adminListOrders({ eventId, status, search });
  }

  @Get('orders/:id')
  @Permissions('admin.billing.read')
  getOrder(@Param('id') id: string) {
    return this.tickets.adminGetOrder(id);
  }

  @Post('orders/manual')
  @Permissions('admin.billing.write')
  manualOrder(
    @Body()
    body: {
      eventId: string;
      qtyStd?: number;
      qtyVip?: number;
      qtyDrinks?: number;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      sendEmail?: boolean;
      markFree?: boolean;
    },
  ) {
    return this.tickets.adminManualOrder(body);
  }

  @Post('orders/:id/resend')
  @Permissions('admin.billing.write')
  resend(@Param('id') id: string) {
    return this.tickets.adminResendTickets(id);
  }

  @Get('claims')
  @Permissions('admin.billing.read')
  listClaims(@Query('eventId') eventId?: string) {
    return this.tickets.adminListClaims(eventId);
  }

  @Post('claims/:id/archive')
  @Permissions('admin.billing.write')
  archiveClaim(@Param('id') id: string) {
    return this.tickets.adminArchiveClaim(id);
  }

  @Get('check-in/lookup')
  @Permissions('admin.billing.read')
  lookup(@Query('code') code: string) {
    return this.tickets.lookupTicket(code || '');
  }

  @Post('check-in')
  @Permissions('admin.billing.write')
  checkIn(
    @Body() body: { code: string },
    @Req() req: { user: JwtPayload },
  ) {
    const by = [req.user.email, req.user.sub].filter(Boolean).join(' / ');
    return this.tickets.checkInTicket(body.code || '', by);
  }
}
