import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';

export type TicketType = 'std' | 'vip';

export function slugifyModeshowTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `event-${Date.now()}`;
}

export function newOrderKey(): string {
  return randomBytes(16).toString('hex');
}

export function newTicketCode(orderId: string, counter: number): string {
  const h = createHash('sha256')
    .update(`${orderId}|${counter}|${randomBytes(8).toString('hex')}|${Date.now()}`)
    .digest('hex');
  return h.slice(0, 14).toUpperCase();
}

export function money(n: number | string | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

export function formatEur(amount: Prisma.Decimal | number | string): string {
  const n = Number(amount);
  return `€ ${n.toFixed(2).replace('.', ',')}`;
}

export function ticketTypeLabel(type: TicketType): string {
  return type === 'vip' ? 'VIP-ticket' : 'Standaardticket';
}

export type CartQuote = {
  qtyStd: number;
  qtyVip: number;
  unitPriceStd: Prisma.Decimal;
  unitPriceVip: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  couponCode: string | null;
  couponTicketType: TicketType | null;
};

export function quoteCart(input: {
  qtyStd: number;
  qtyVip: number;
  priceStd: Prisma.Decimal;
  priceVip: Prisma.Decimal;
  coupon?: { code: string; ticketType: TicketType; maxQty: number } | null;
}): CartQuote {
  const qtyStd = Math.max(0, Math.floor(input.qtyStd || 0));
  const qtyVip = Math.max(0, Math.floor(input.qtyVip || 0));
  const unitPriceStd = money(input.priceStd);
  const unitPriceVip = money(input.priceVip);
  const lineStd = unitPriceStd.mul(qtyStd);
  const lineVip = unitPriceVip.mul(qtyVip);
  const subtotal = lineStd.add(lineVip);

  let discountAmount = money(0);
  let couponCode: string | null = null;
  let couponTicketType: TicketType | null = null;

  if (input.coupon) {
    const type = input.coupon.ticketType;
    const qty = type === 'std' ? qtyStd : qtyVip;
    const unit = type === 'std' ? unitPriceStd : unitPriceVip;
    if (qty > 0 && unit.gt(0)) {
      const freeQty = Math.min(Math.max(1, input.coupon.maxQty), qty);
      discountAmount = unit.mul(freeQty);
      couponCode = input.coupon.code;
      couponTicketType = type;
    }
  }

  if (discountAmount.gt(subtotal)) discountAmount = subtotal;
  const totalAmount = subtotal.sub(discountAmount);
  return {
    qtyStd,
    qtyVip,
    unitPriceStd,
    unitPriceVip,
    subtotal,
    discountAmount,
    totalAmount: totalAmount.lt(0) ? money(0) : totalAmount,
    couponCode,
    couponTicketType,
  };
}

export function parseEventDateOnly(isoDate: string): Date {
  const raw = isoDate.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) {
    // Browser/locale: DD-MM-YYYY of DD/MM/YYYY
    m = /^(\d{2})[-/.](\d{2})[-/.](\d{4})$/.exec(raw);
    if (m) {
      return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0));
    }
    throw new Error('Ongeldige datum (verwacht JJJJ-MM-DD)');
  }
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
}

export function formatEventDateNl(d: Date): string {
  try {
    return new Intl.DateTimeFormat('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Brussels',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatAddress(parts: {
  venueName?: string | null;
  street?: string | null;
  streetNo?: string | null;
  postcode?: string | null;
  city?: string | null;
  locationExtra?: string | null;
}): string {
  const line1 = [parts.street, parts.streetNo].filter(Boolean).join(' ').trim();
  const line2 = [parts.postcode, parts.city].filter(Boolean).join(' ').trim();
  return [parts.venueName, line1, line2, parts.locationExtra].filter(Boolean).join(', ');
}
