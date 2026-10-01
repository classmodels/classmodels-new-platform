import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ModeshowTicketsService } from './modeshow-tickets.service';

@Controller('modeshow-tickets')
export class ModeshowTicketsPublicController {
  constructor(private tickets: ModeshowTicketsService) {}

  @Get('events')
  listEvents() {
    return this.tickets.listPublicEvents();
  }

  @Get('events/:slugOrId')
  getEvent(@Param('slugOrId') slugOrId: string) {
    return this.tickets.getPublicEvent(slugOrId);
  }

  @Post('checkout')
  checkout(
    @Body()
    body: {
      eventId: string;
      qtyStd?: number;
      qtyVip?: number;
      couponCode?: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      street?: string;
      streetNo?: string;
      postcode?: string;
      city?: string;
      returnOrigin?: string;
    },
  ) {
    return this.tickets.checkout(body);
  }

  @Get('orders/:orderKey')
  orderStatus(@Param('orderKey') orderKey: string) {
    return this.tickets.getPublicOrderStatus(orderKey);
  }
}
