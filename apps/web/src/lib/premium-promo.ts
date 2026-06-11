/** Premium: €99/jaar. De eenmalige promo (€48 levenslang) is afgelopen. */

export const PREMIUM_YEARLY_PRICE = 99;
export const PREMIUM_PROMO_PRICE = 48;

export function premiumPromoDeadlineMs(fromMs = Date.now()): number {
  const fromEnv =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_PREMIUM_PROMO_END?.trim()
      : '';
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

export function isPremiumPromoActive(_nowMs = Date.now()): boolean {
  // Promo is afgelopen: premium kost altijd €99 per jaar.
  return false;
}

export function formatPromoCountdown(msLeft: number): string {
  if (msLeft <= 0) return '0:00:00';
  const s = Math.floor(msLeft / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
