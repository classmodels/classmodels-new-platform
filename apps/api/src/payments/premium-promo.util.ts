import { Prisma } from '@prisma/client';

export const PREMIUM_YEARLY_EUROS = new Prisma.Decimal(
  process.env.PREMIUM_YEARLY_PRICE_EUROS?.trim() || '99',
);

export function premiumPromoDeadlineMs(fromMs = Date.now()): number {
  const fromEnv = process.env.PREMIUM_PROMO_END_ISO?.trim();
  if (fromEnv) {
    const t = new Date(fromEnv).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const now = new Date(fromMs);
  const day = now.getDay();
  let addDays = (6 - day + 7) % 7;
  if (day === 6 && now.getHours() >= 12) addDays = 7;
  const end = new Date(now);
  end.setDate(end.getDate() + addDays);
  end.setHours(12, 0, 0, 0);
  return end.getTime();
}

export function isPremiumPromoActive(nowMs = Date.now()): boolean {
  return nowMs < premiumPromoDeadlineMs(nowMs);
}
