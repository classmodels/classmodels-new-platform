const TZ = 'Europe/Brussels';

/** Kalenderdag in Brussel (YYYY-MM-DD) voor ref (standaard nu). */
export function brusselsYmd(ref = new Date(), dayOffset = 0): string {
  const d = new Date(ref.getTime() + dayOffset * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

/** Start en einde van een kalenderdag in Europe/Brussels (als UTC Date). */
export function brusselsDayBounds(ymd: string): { from: Date; to: Date } {
  const probe = new Date(`${ymd}T12:00:00.000Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    hour12: false,
    timeZoneName: 'shortOffset',
  }).formatToParts(probe);
  const offPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1';
  const m = offPart.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
  const sign = m?.[1] === '-' ? -1 : 1;
  const h = parseInt(m?.[2] ?? '1', 10);
  const min = parseInt(m?.[3] ?? '0', 10);
  const offsetMin = sign * (h * 60 + min);
  const from = new Date(`${ymd}T00:00:00.000Z`);
  from.setUTCMinutes(from.getUTCMinutes() - offsetMin);
  const to = new Date(`${ymd}T23:59:59.999Z`);
  to.setUTCMinutes(to.getUTCMinutes() - offsetMin);
  return { from, to };
}

/** Vanaf middernacht Brussel tot nu, of meerdere dagen terug. */
export function brusselsRangeFromDaysBack(daysBack: number): { from: Date; to: Date } {
  const to = new Date();
  const startYmd = brusselsYmd(to, -(daysBack - 1));
  const { from } = brusselsDayBounds(startYmd);
  return { from, to };
}
