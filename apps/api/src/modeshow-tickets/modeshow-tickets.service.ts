import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import createMollieClient from '@mollie/api-client';
import { PrismaService } from '../prisma/prisma.service';
import { sendHtmlMailWithAttachments } from '../mail/send-html-mail';
import { buildModeshowTicketsPdf } from './modeshow-ticket-pdf';
import {
  formatAddress,
  formatEur,
  formatEventDateNl,
  money,
  newOrderKey,
  newTicketCode,
  parseEventDateOnly,
  quoteCart,
  slugifyModeshowTitle,
  ticketTypeLabel,
  type TicketType,
} from './modeshow-ticket-utils';

function webBase(): string {
  return (
    process.env.WEB_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function apiPublicBase(): string {
  return (
    process.env.API_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000'
  ).replace(/\/$/, '');
}

@Injectable()
export class ModeshowTicketsService {
  private readonly log = new Logger(ModeshowTicketsService.name);

  constructor(private prisma: PrismaService) {}

  /* ---------- Public ---------- */

  async listPublicEvents() {
    const rows = await this.prisma.modeshowEvent.findMany({
      where: { published: true, archived: false },
      orderBy: [{ eventDate: 'asc' }, { sortOrder: 'asc' }],
    });
    const sold = await this.soldCounts(rows.map((r) => r.id));
    return rows.map((e) => this.serializeEvent(e, sold.get(e.id) ?? 0, true));
  }

  async getPublicEvent(slugOrId: string) {
    const e = await this.findEventBySlugOrId(slugOrId);
    if (!e || !e.published || e.archived) throw new NotFoundException('Evenement niet gevonden');
    const sold = (await this.soldCounts([e.id])).get(e.id) ?? 0;
    return this.serializeEvent(e, sold, true);
  }

  async checkout(dto: {
    eventId: string;
    qtyStd?: number;
    qtyVip?: number;
    couponCode?: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    street?: string;
    streetNo?: string;
    postcode?: string;
    city?: string;
    returnOrigin?: string | null;
  }) {
    const event = await this.prisma.modeshowEvent.findUnique({
      where: { id: dto.eventId },
      include: { coupons: { where: { active: true } } },
    });
    if (!event || !event.published || event.archived) {
      throw new NotFoundException('Evenement niet beschikbaar');
    }

    const qtyStd = Math.max(0, Math.floor(Number(dto.qtyStd) || 0));
    const qtyVip = Math.max(0, Math.floor(Number(dto.qtyVip) || 0));
    if (qtyStd + qtyVip < 1) throw new BadRequestException('Kies minstens één ticket.');
    if (event.priceStd.lte(0) && qtyStd > 0) {
      throw new BadRequestException('Standaardtickets zijn niet beschikbaar voor dit evenement.');
    }
    if (event.priceVip.lte(0) && qtyVip > 0) {
      throw new BadRequestException('VIP-tickets zijn niet beschikbaar voor dit evenement.');
    }

    const sold = (await this.soldCounts([event.id])).get(event.id) ?? 0;
    if (event.ticketStock != null && sold + qtyStd + qtyVip > event.ticketStock) {
      const left = Math.max(0, event.ticketStock - sold);
      throw new BadRequestException(
        left === 0 ? 'Dit evenement is uitverkocht.' : `Nog slechts ${left} ticket(s) beschikbaar.`,
      );
    }

    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    const email = dto.email?.trim().toLowerCase();
    if (!firstName || !lastName || !email || !email.includes('@')) {
      throw new BadRequestException('Vul voornaam, naam en een geldig e-mailadres in.');
    }

    let coupon: { code: string; ticketType: TicketType; maxQty: number } | null = null;
    const rawCode = (dto.couponCode ?? '').trim().toUpperCase();
    if (rawCode) {
      const match = event.coupons.find((c) => c.code.toUpperCase() === rawCode);
      if (!match) throw new BadRequestException('Ongeldige couponcode.');
      const type = match.ticketType === 'vip' ? 'vip' : 'std';
      if ((type === 'std' && qtyStd < 1) || (type === 'vip' && qtyVip < 1)) {
        throw new BadRequestException(
          `Deze coupon geldt alleen voor ${ticketTypeLabel(type).toLowerCase()}en.`,
        );
      }
      coupon = { code: match.code.toUpperCase(), ticketType: type, maxQty: match.maxQty };
    }

    const quote = quoteCart({
      qtyStd,
      qtyVip,
      priceStd: event.priceStd,
      priceVip: event.priceVip,
      coupon,
    });

    const order = await this.prisma.modeshowTicketOrder.create({
      data: {
        eventId: event.id,
        orderKey: newOrderKey(),
        status: 'pending',
        firstName,
        lastName,
        email,
        phone: dto.phone?.trim() || null,
        street: dto.street?.trim() || null,
        streetNo: dto.streetNo?.trim() || null,
        postcode: dto.postcode?.trim() || null,
        city: dto.city?.trim() || null,
        qtyStd: quote.qtyStd,
        qtyVip: quote.qtyVip,
        unitPriceStd: quote.unitPriceStd,
        unitPriceVip: quote.unitPriceVip,
        subtotal: quote.subtotal,
        discountAmount: quote.discountAmount,
        totalAmount: quote.totalAmount,
        couponCode: quote.couponCode,
        couponTicketType: quote.couponTicketType,
      },
    });

    if (quote.totalAmount.lte(0)) {
      await this.fulfillOrder(order.id, { status: 'free', paymentStatus: 'free' });
      return {
        skipCheckout: true as const,
        freeOrder: true as const,
        orderId: order.id,
        orderKey: order.orderKey,
        thanksUrl: this.thanksUrl(order.orderKey, dto.returnOrigin),
      };
    }

    const mode = await this.resolveMollieMode();
    const apiKey = await this.mollieApiKey(mode);
    if (!apiKey) {
      // Lokaal zonder Mollie-key: bestelling gratis afronden zodat de flow testbaar blijft.
      const allowDev =
        process.env.NODE_ENV !== 'production' ||
        String(process.env.ALLOW_TICKET_DEV_CHECKOUT || '').trim() === '1';
      if (allowDev) {
        this.log.warn(
          `Geen Mollie-key — order ${order.id} als gratis afgerond (dev checkout).`,
        );
        await this.fulfillOrder(order.id, { status: 'free', paymentStatus: 'dev_free' });
        return {
          skipCheckout: true as const,
          freeOrder: true as const,
          orderId: order.id,
          orderKey: order.orderKey,
          thanksUrl: this.thanksUrl(order.orderKey, dto.returnOrigin),
          devCheckout: true as const,
        };
      }
      throw new BadRequestException(
        'Online betalen is tijdelijk niet beschikbaar. Probeer later opnieuw of contacteer Class-Models.',
      );
    }

    const mollie = createMollieClient({ apiKey });
    const webhookUrl = `${apiPublicBase()}/payments/mollie/webhook`;
    const redirectUrl = this.thanksUrl(order.orderKey, dto.returnOrigin);

    const payment = await mollie.payments.create({
      amount: { currency: 'EUR', value: quote.totalAmount.toFixed(2) },
      description: `Modeshow tickets: ${event.title} (#${order.id.slice(0, 8)})`,
      redirectUrl,
      webhookUrl,
      metadata: {
        kind: 'modeshow_ticket',
        orderId: order.id,
        orderKey: order.orderKey,
        eventId: event.id,
      },
    });

    await this.prisma.modeshowTicketOrder.update({
      where: { id: order.id },
      data: {
        status: 'pending_payment',
        molliePaymentId: payment.id,
        paymentStatus: payment.status,
      },
    });

    const checkoutUrl = payment.getCheckoutUrl();
    if (!checkoutUrl) throw new BadRequestException('Geen Mollie checkout-URL ontvangen.');

    return {
      checkoutUrl,
      paymentId: payment.id,
      orderId: order.id,
      orderKey: order.orderKey,
      thanksUrl: redirectUrl,
    };
  }

  async getPublicOrderStatus(orderKey: string) {
    const order = await this.prisma.modeshowTicketOrder.findUnique({
      where: { orderKey },
      include: { event: true, tickets: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Bestelling niet gevonden');

    // Return-URL zonder werkende webhook (localhost): probeer Mollie te syncen.
    if (
      order.molliePaymentId &&
      (order.status === 'pending_payment' || order.status === 'pending')
    ) {
      try {
        await this.syncOrderFromMollie(order.molliePaymentId);
      } catch (e) {
        this.log.warn(`Sync order ${order.id} vanaf Mollie mislukt: ${e}`);
      }
    }

    const fresh = await this.prisma.modeshowTicketOrder.findUnique({
      where: { id: order.id },
      include: { event: true, tickets: { orderBy: { createdAt: 'asc' } } },
    });
    if (!fresh) throw new NotFoundException('Bestelling niet gevonden');
    return this.serializeOrder(fresh);
  }

  /* ---------- Mollie webhook / fulfill ---------- */

  async fulfillByMolliePaymentId(paymentId: string, paymentStatus: string) {
    const order = await this.prisma.modeshowTicketOrder.findUnique({
      where: { molliePaymentId: paymentId },
    });
    if (!order) return false;

    await this.prisma.modeshowTicketOrder.update({
      where: { id: order.id },
      data: { paymentStatus },
    });

    if (paymentStatus === 'paid' && order.status !== 'paid' && order.status !== 'free') {
      await this.fulfillOrder(order.id, { status: 'paid', paymentStatus });
    } else if (
      ['failed', 'canceled', 'expired'].includes(paymentStatus) &&
      order.status === 'pending_payment'
    ) {
      await this.prisma.modeshowTicketOrder.update({
        where: { id: order.id },
        data: { status: 'failed', paymentStatus },
      });
    }
    return true;
  }

  private async syncOrderFromMollie(paymentId: string) {
    const mode = await this.resolveMollieMode();
    const apiKey = await this.mollieApiKey(mode);
    if (!apiKey) return;
    const mollie = createMollieClient({ apiKey });
    const payment = await mollie.payments.get(paymentId);
    await this.fulfillByMolliePaymentId(payment.id, payment.status);
  }

  private async fulfillOrder(
    orderId: string,
    opts: { status: 'paid' | 'free'; paymentStatus: string },
  ) {
    const order = await this.prisma.modeshowTicketOrder.findUnique({
      where: { id: orderId },
      include: { event: true, tickets: true },
    });
    if (!order) return;
    if (order.status === 'paid' || order.status === 'free') {
      if (!order.ticketsEmailSentAt) void this.sendTicketsEmail(order.id);
      return;
    }

    const ticketsData: Prisma.ModeshowTicketCreateManyInput[] = [];
    let counter = 0;
    for (let i = 0; i < order.qtyStd; i++) {
      counter += 1;
      ticketsData.push({
        orderId: order.id,
        code: newTicketCode(order.id, counter),
        ticketType: 'std',
        label: ticketTypeLabel('std'),
      });
    }
    for (let i = 0; i < order.qtyVip; i++) {
      counter += 1;
      ticketsData.push({
        orderId: order.id,
        code: newTicketCode(order.id, counter),
        ticketType: 'vip',
        label: ticketTypeLabel('vip'),
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.modeshowTicketOrder.update({
        where: { id: order.id },
        data: {
          status: opts.status,
          paymentStatus: opts.paymentStatus,
          paidAt: new Date(),
        },
      });
      if (ticketsData.length) {
        await tx.modeshowTicket.createMany({ data: ticketsData });
      }
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'modeshow_ticket.fulfilled',
        meta: {
          orderId: order.id,
          eventId: order.eventId,
          status: opts.status,
          totalAmount: order.totalAmount.toString(),
          email: order.email,
        },
      },
    });

    void this.sendTicketsEmail(order.id);
  }

  async sendTicketsEmail(orderId: string, force = false) {
    const order = await this.prisma.modeshowTicketOrder.findUnique({
      where: { id: orderId },
      include: { event: true, tickets: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) return { ok: false, error: 'Bestelling niet gevonden' };
    if (order.status !== 'paid' && order.status !== 'free') {
      return { ok: false, error: 'Bestelling is niet betaald' };
    }
    if (order.ticketsEmailSentAt && !force) return { ok: true, alreadySent: true };
    if (!order.tickets.length) {
      return { ok: false, error: 'Geen tickets gegenereerd' };
    }

    try {
      const pdf = await buildModeshowTicketsPdf({
        event: order.event,
        order,
        tickets: order.tickets,
        claimBaseUrl: `${webBase()}/tickets/check-in`,
      });
      const dateLabel = formatEventDateNl(order.event.eventDate);
      const html = `<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#191919;">Beste ${escapeHtml(order.firstName)},</p>
<p style="margin:0 0 16px;color:#262420;font-size:15px;line-height:1.6;">Bedankt voor je bestelling voor <strong>${escapeHtml(order.event.title)}</strong> op ${escapeHtml(dateLabel)}.</p>
<p style="margin:0 0 16px;color:#262420;font-size:15px;line-height:1.6;">In bijlage vind je je ticket(s) als PDF met QR-code. Toon deze aan de ingang.</p>
<p style="margin:0 0 8px;color:#525049;font-size:13px;">Totaal: ${formatEur(order.totalAmount)} · ${order.tickets.length} ticket(s)</p>
<p style="margin:24px 0 0;color:#262420;font-size:15px;">Tot dan,<br/>Class-Models</p>`;

      const r = await sendHtmlMailWithAttachments(
        this.prisma,
        order.email,
        `Je tickets: ${order.event.title} — Class-Models`,
        html,
        [{ filename: `tickets-${order.id.slice(0, 8)}.pdf`, content: pdf }],
      );
      if (r.ok) {
        await this.prisma.modeshowTicketOrder.update({
          where: { id: order.id },
          data: { ticketsEmailSentAt: new Date() },
        });
      }
      return r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`Ticketmail mislukt voor ${order.id}: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  /* ---------- Admin events ---------- */

  async adminListEvents() {
    const rows = await this.prisma.modeshowEvent.findMany({
      orderBy: [{ eventDate: 'desc' }, { sortOrder: 'asc' }],
      include: { _count: { select: { orders: true, coupons: true } } },
    });
    const sold = await this.soldCounts(rows.map((r) => r.id));
    return rows.map((e) => ({
      ...this.serializeEvent(e, sold.get(e.id) ?? 0, false),
      ordersCount: e._count.orders,
      couponsCount: e._count.coupons,
    }));
  }

  async adminGetEvent(id: string) {
    const e = await this.prisma.modeshowEvent.findUnique({
      where: { id },
      include: { coupons: { orderBy: { createdAt: 'asc' } } },
    });
    if (!e) throw new NotFoundException('Evenement niet gevonden');
    const sold = (await this.soldCounts([e.id])).get(e.id) ?? 0;
    return {
      ...this.serializeEvent(e, sold, false),
      coupons: e.coupons.map((c) => ({
        id: c.id,
        code: c.code,
        ticketType: c.ticketType,
        maxQty: c.maxQty,
        active: c.active,
      })),
    };
  }

  async adminCreateEvent(dto: Record<string, unknown>) {
    const title = String(dto.title ?? '').trim();
    if (!title) throw new BadRequestException('Titel is verplicht');
    let slug = String(dto.slug ?? '').trim() || slugifyModeshowTitle(title);
    slug = slugifyModeshowTitle(slug);
    const exists = await this.prisma.modeshowEvent.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${randomBytes(2).toString('hex')}`;

    const eventDate = parseEventDateOnly(String(dto.eventDate ?? ''));
    const row = await this.prisma.modeshowEvent.create({
      data: {
        slug,
        title,
        summary: strOrNull(dto.summary),
        description: strOrNull(dto.description),
        eventDate,
        doorsTime: strOrNull(dto.doorsTime),
        startTime: strOrNull(dto.startTime),
        venueName: strOrNull(dto.venueName),
        street: strOrNull(dto.street),
        streetNo: strOrNull(dto.streetNo),
        postcode: strOrNull(dto.postcode),
        city: strOrNull(dto.city),
        locationExtra: strOrNull(dto.locationExtra),
        priceStd: money(Number(dto.priceStd) || 0),
        priceVip: money(Number(dto.priceVip) || 0),
        ticketStock:
          dto.ticketStock === null || dto.ticketStock === '' || dto.ticketStock === undefined
            ? null
            : Math.max(0, Math.floor(Number(dto.ticketStock))),
        published: Boolean(dto.published),
        coverImageUrl: strOrNull(dto.coverImageUrl),
        ticketFooter: strOrNull(dto.ticketFooter),
        sortOrder: Math.floor(Number(dto.sortOrder) || 0),
      },
    });
    return this.adminGetEvent(row.id);
  }

  async adminUpdateEvent(id: string, dto: Record<string, unknown>) {
    const existing = await this.prisma.modeshowEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Evenement niet gevonden');

    const data: Prisma.ModeshowEventUpdateInput = {};
    if (dto.title !== undefined) data.title = String(dto.title).trim();
    if (dto.slug !== undefined) {
      const slug = slugifyModeshowTitle(String(dto.slug));
      const clash = await this.prisma.modeshowEvent.findFirst({
        where: { slug, NOT: { id } },
      });
      if (clash) throw new BadRequestException('Slug bestaat al');
      data.slug = slug;
    }
    if (dto.summary !== undefined) data.summary = strOrNull(dto.summary);
    if (dto.description !== undefined) data.description = strOrNull(dto.description);
    if (dto.eventDate !== undefined) data.eventDate = parseEventDateOnly(String(dto.eventDate));
    if (dto.doorsTime !== undefined) data.doorsTime = strOrNull(dto.doorsTime);
    if (dto.startTime !== undefined) data.startTime = strOrNull(dto.startTime);
    if (dto.venueName !== undefined) data.venueName = strOrNull(dto.venueName);
    if (dto.street !== undefined) data.street = strOrNull(dto.street);
    if (dto.streetNo !== undefined) data.streetNo = strOrNull(dto.streetNo);
    if (dto.postcode !== undefined) data.postcode = strOrNull(dto.postcode);
    if (dto.city !== undefined) data.city = strOrNull(dto.city);
    if (dto.locationExtra !== undefined) data.locationExtra = strOrNull(dto.locationExtra);
    if (dto.priceStd !== undefined) data.priceStd = money(Number(dto.priceStd) || 0);
    if (dto.priceVip !== undefined) data.priceVip = money(Number(dto.priceVip) || 0);
    if (dto.ticketStock !== undefined) {
      data.ticketStock =
        dto.ticketStock === null || dto.ticketStock === ''
          ? null
          : Math.max(0, Math.floor(Number(dto.ticketStock)));
    }
    if (dto.published !== undefined) data.published = Boolean(dto.published);
    if (dto.archived !== undefined) data.archived = Boolean(dto.archived);
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = strOrNull(dto.coverImageUrl);
    if (dto.ticketFooter !== undefined) data.ticketFooter = strOrNull(dto.ticketFooter);
    if (dto.sortOrder !== undefined) data.sortOrder = Math.floor(Number(dto.sortOrder) || 0);

    await this.prisma.modeshowEvent.update({ where: { id }, data });
    return this.adminGetEvent(id);
  }

  async adminUpsertCoupon(
    eventId: string,
    dto: { code: string; ticketType: string; maxQty?: number; active?: boolean; id?: string },
  ) {
    const event = await this.prisma.modeshowEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evenement niet gevonden');
    const code = dto.code.trim().toUpperCase();
    if (!code) throw new BadRequestException('Code is verplicht');
    const ticketType = dto.ticketType === 'vip' ? 'vip' : 'std';
    const maxQty = Math.max(1, Math.floor(Number(dto.maxQty) || 1));
    if (dto.id) {
      await this.prisma.modeshowTicketCoupon.update({
        where: { id: dto.id },
        data: { code, ticketType, maxQty, active: dto.active !== false },
      });
    } else {
      await this.prisma.modeshowTicketCoupon.create({
        data: { eventId, code, ticketType, maxQty, active: dto.active !== false },
      });
    }
    return this.adminGetEvent(eventId);
  }

  async adminDeleteCoupon(eventId: string, couponId: string) {
    await this.prisma.modeshowTicketCoupon.deleteMany({ where: { id: couponId, eventId } });
    return this.adminGetEvent(eventId);
  }

  /* ---------- Admin orders / check-in ---------- */

  async adminListOrders(q?: { eventId?: string; status?: string; search?: string }) {
    const where: Prisma.ModeshowTicketOrderWhereInput = {};
    if (q?.eventId) where.eventId = q.eventId;
    if (q?.status) where.status = q.status;
    if (q?.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { email: { contains: s } },
        { firstName: { contains: s } },
        { lastName: { contains: s } },
        { orderKey: { contains: s } },
        { tickets: { some: { code: { contains: s } } } },
      ];
    }
    const rows = await this.prisma.modeshowTicketOrder.findMany({
      where,
      include: {
        event: { select: { id: true, title: true, slug: true, eventDate: true } },
        tickets: { select: { id: true, code: true, ticketType: true, checkedIn: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return rows.map((o) => this.serializeOrder(o));
  }

  async adminGetOrder(id: string) {
    const order = await this.prisma.modeshowTicketOrder.findUnique({
      where: { id },
      include: { event: true, tickets: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Bestelling niet gevonden');
    return this.serializeOrder(order);
  }

  async adminResendTickets(orderId: string) {
    return this.sendTicketsEmail(orderId, true);
  }

  async adminManualOrder(dto: {
    eventId: string;
    qtyStd?: number;
    qtyVip?: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    sendEmail?: boolean;
    markFree?: boolean;
  }) {
    const event = await this.prisma.modeshowEvent.findUnique({ where: { id: dto.eventId } });
    if (!event) throw new NotFoundException('Evenement niet gevonden');
    const qtyStd = Math.max(0, Math.floor(Number(dto.qtyStd) || 0));
    const qtyVip = Math.max(0, Math.floor(Number(dto.qtyVip) || 0));
    if (qtyStd + qtyVip < 1) throw new BadRequestException('Kies minstens één ticket.');
    const quote = quoteCart({
      qtyStd,
      qtyVip,
      priceStd: event.priceStd,
      priceVip: event.priceVip,
      coupon: null,
    });
    const free = dto.markFree || quote.totalAmount.lte(0);
    const order = await this.prisma.modeshowTicketOrder.create({
      data: {
        eventId: event.id,
        orderKey: newOrderKey(),
        status: 'pending',
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        qtyStd: quote.qtyStd,
        qtyVip: quote.qtyVip,
        unitPriceStd: quote.unitPriceStd,
        unitPriceVip: quote.unitPriceVip,
        subtotal: free ? money(0) : quote.subtotal,
        discountAmount: free ? quote.subtotal : money(0),
        totalAmount: free ? money(0) : quote.totalAmount,
      },
    });
    await this.fulfillOrder(order.id, {
      status: free ? 'free' : 'paid',
      paymentStatus: free ? 'free' : 'manual',
    });
    if (dto.sendEmail === false) {
      await this.prisma.modeshowTicketOrder.update({
        where: { id: order.id },
        data: { ticketsEmailSentAt: new Date() },
      });
    }
    return this.adminGetOrder(order.id);
  }

  async lookupTicket(code: string) {
    const ticket = await this.prisma.modeshowTicket.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        order: { include: { event: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket niet gevonden');
    return {
      ticket: {
        id: ticket.id,
        code: ticket.code,
        ticketType: ticket.ticketType,
        label: ticket.label,
        checkedIn: ticket.checkedIn,
        checkedInAt: ticket.checkedInAt,
      },
      order: {
        id: ticket.order.id,
        status: ticket.order.status,
        firstName: ticket.order.firstName,
        lastName: ticket.order.lastName,
        email: ticket.order.email,
      },
      event: {
        id: ticket.order.event.id,
        title: ticket.order.event.title,
        eventDate: ticket.order.event.eventDate.toISOString().slice(0, 10),
      },
      canCheckIn: (ticket.order.status === 'paid' || ticket.order.status === 'free') && !ticket.checkedIn,
    };
  }

  async checkInTicket(code: string, by?: string) {
    const info = await this.lookupTicket(code);
    if (!info.canCheckIn) {
      if (info.ticket.checkedIn) throw new BadRequestException('Dit ticket is al ingecheckt.');
      throw new BadRequestException('Ticket is niet geldig voor check-in (niet betaald).');
    }
    const updated = await this.prisma.modeshowTicket.update({
      where: { id: info.ticket.id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: by?.trim() || 'admin',
      },
    });
    return {
      ok: true,
      ticket: {
        id: updated.id,
        code: updated.code,
        ticketType: updated.ticketType,
        checkedIn: updated.checkedIn,
        checkedInAt: updated.checkedInAt,
      },
      order: info.order,
      event: info.event,
    };
  }

  async ensureDemoEventIfEmpty() {
    const count = await this.prisma.modeshowEvent.count();
    if (count > 0) return { created: false };
    const eventDate = new Date();
    eventDate.setUTCDate(eventDate.getUTCDate() + 45);
    const created = await this.prisma.modeshowEvent.create({
      data: {
        slug: 'modeshow-voorbeeld',
        title: 'Class-Models Modeshow',
        summary: 'Beleef een avond vol fashion, muziek en sfeer.',
        description:
          'Welkom op de Class-Models modeshow. Deuren openen tijdig; toon je digitale of geprinte ticket met QR-code aan de ingang.',
        eventDate,
        doorsTime: '19:00',
        startTime: '20:00',
        venueName: 'Hangar 604',
        street: 'Provinciebaan',
        streetNo: '3',
        postcode: '2235',
        city: 'Hulshout',
        priceStd: money(25),
        priceVip: money(45),
        ticketStock: 200,
        published: true,
        ticketFooter: 'Geldig voor één persoon. Niet doorverkoopbaar zonder toestemming van Class-Models.',
        coupons: {
          create: [
            { code: 'VIP1', ticketType: 'vip', maxQty: 1, active: true },
            { code: 'STD2', ticketType: 'std', maxQty: 2, active: true },
          ],
        },
      },
    });
    this.log.log(`Modeshow demo-event aangemaakt: ${created.slug}`);
    return { created: true, id: created.id };
  }

  /* ---------- helpers ---------- */

  private thanksUrl(orderKey: string, returnOrigin?: string | null) {
    let base = webBase();
    const origin = (returnOrigin ?? '').trim().replace(/\/$/, '');
    if (/^https?:\/\//i.test(origin)) {
      try {
        const u = new URL(origin);
        if (['localhost', '127.0.0.1', 'www.class-models.be', 'class-models.be'].includes(u.hostname)) {
          base = `${u.protocol}//${u.host}`;
        }
      } catch {
        /* keep */
      }
    }
    return `${base}/tickets/bedankt?order=${encodeURIComponent(orderKey)}`;
  }

  private async soldCounts(eventIds: string[]) {
    const map = new Map<string, number>();
    if (!eventIds.length) return map;
    const paid = await this.prisma.modeshowTicketOrder.findMany({
      where: { eventId: { in: eventIds }, status: { in: ['paid', 'free'] } },
      select: { eventId: true, qtyStd: true, qtyVip: true },
    });
    for (const o of paid) {
      map.set(o.eventId, (map.get(o.eventId) ?? 0) + o.qtyStd + o.qtyVip);
    }
    return map;
  }

  private async findEventBySlugOrId(slugOrId: string) {
    return this.prisma.modeshowEvent.findFirst({
      where: { OR: [{ id: slugOrId }, { slug: slugOrId }] },
    });
  }

  private serializeEvent(
    e: {
      id: string;
      slug: string;
      title: string;
      summary: string | null;
      description: string | null;
      eventDate: Date;
      doorsTime: string | null;
      startTime: string | null;
      venueName: string | null;
      street: string | null;
      streetNo: string | null;
      postcode: string | null;
      city: string | null;
      locationExtra: string | null;
      priceStd: Prisma.Decimal;
      priceVip: Prisma.Decimal;
      ticketStock: number | null;
      published: boolean;
      archived: boolean;
      coverImageUrl: string | null;
      ticketFooter: string | null;
      sortOrder: number;
    },
    sold: number,
    publicView: boolean,
  ) {
    const remaining =
      e.ticketStock == null ? null : Math.max(0, e.ticketStock - sold);
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      summary: e.summary,
      description: e.description,
      eventDate: e.eventDate.toISOString().slice(0, 10),
      eventDateLabel: formatEventDateNl(e.eventDate),
      doorsTime: e.doorsTime,
      startTime: e.startTime,
      venueName: e.venueName,
      street: e.street,
      streetNo: e.streetNo,
      postcode: e.postcode,
      city: e.city,
      locationExtra: e.locationExtra,
      addressLabel: formatAddress(e),
      priceStd: Number(e.priceStd),
      priceVip: Number(e.priceVip),
      ticketStock: e.ticketStock,
      sold,
      remaining,
      soldOut: remaining === 0,
      published: e.published,
      archived: e.archived,
      coverImageUrl: e.coverImageUrl,
      ticketFooter: publicView ? undefined : e.ticketFooter,
      sortOrder: e.sortOrder,
      hasStd: Number(e.priceStd) > 0,
      hasVip: Number(e.priceVip) > 0,
    };
  }

  private serializeOrder(o: {
    id: string;
    orderKey: string;
    status: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    street?: string | null;
    streetNo?: string | null;
    postcode?: string | null;
    city?: string | null;
    qtyStd: number;
    qtyVip: number;
    subtotal: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    couponCode: string | null;
    paymentStatus: string | null;
    paidAt: Date | null;
    ticketsEmailSentAt: Date | null;
    createdAt: Date;
    event?: {
      id: string;
      title: string;
      slug?: string;
      eventDate?: Date;
    } | null;
    tickets?: Array<{
      id: string;
      code: string;
      ticketType: string;
      label?: string;
      checkedIn: boolean;
      checkedInAt?: Date | null;
    }>;
  }) {
    return {
      id: o.id,
      orderKey: o.orderKey,
      status: o.status,
      firstName: o.firstName,
      lastName: o.lastName,
      email: o.email,
      phone: o.phone,
      street: o.street ?? null,
      streetNo: o.streetNo ?? null,
      postcode: o.postcode ?? null,
      city: o.city ?? null,
      qtyStd: o.qtyStd,
      qtyVip: o.qtyVip,
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discountAmount),
      totalAmount: Number(o.totalAmount),
      couponCode: o.couponCode,
      paymentStatus: o.paymentStatus,
      paidAt: o.paidAt,
      ticketsEmailSentAt: o.ticketsEmailSentAt,
      createdAt: o.createdAt,
      event: o.event
        ? {
            id: o.event.id,
            title: o.event.title,
            slug: o.event.slug,
            eventDate: o.event.eventDate
              ? o.event.eventDate.toISOString().slice(0, 10)
              : undefined,
          }
        : null,
      tickets: (o.tickets ?? []).map((t) => ({
        id: t.id,
        code: t.code,
        ticketType: t.ticketType,
        label: t.label,
        checkedIn: t.checkedIn,
        checkedInAt: t.checkedInAt ?? null,
      })),
    };
  }

  private async resolveMollieMode(): Promise<'test' | 'live'> {
    const row = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    const mode = (row?.activeMode || process.env.MOLLIE_MODE || 'test').toLowerCase();
    return mode === 'live' ? 'live' : 'test';
  }

  private async mollieApiKey(mode: 'test' | 'live'): Promise<string | null> {
    const row = await this.prisma.mollieSettings.findUnique({ where: { id: 1 } });
    const fromDb = mode === 'live' ? row?.apiKeyLive : row?.apiKeyTest;
    if (fromDb?.trim()) return fromDb.trim();
    const fromEnv =
      mode === 'live'
        ? process.env.MOLLIE_API_KEY_LIVE
        : process.env.MOLLIE_API_KEY_TEST;
    return fromEnv?.trim() || null;
  }
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
