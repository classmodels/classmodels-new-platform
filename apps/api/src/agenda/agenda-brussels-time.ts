/** Agenda-tijden: altijd Europe/Brussels (België), inclusief zomer-/wintertijd. */

export const AGENDA_TIMEZONE = 'Europe/Brussels';

/** Datum-only uit DB (`slotDate` = YYYY-MM-DD op 12:00 UTC). */
export function slotDateToYmd(slotDate: Date): string {
  return slotDate.toISOString().slice(0, 10);
}

export function normTimePlain(t: string): string {
  const s = t.trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error('invalid_time');
  const h = `${parseInt(m[1], 10)}`.padStart(2, '0');
  const min = m[2].padStart(2, '0');
  const sec = (m[3] ?? '00').padStart(2, '0');
  return `${h}:${min}:${sec}`;
}

/** Offset in minuten: lokaal Brussels = UTC + offset. */
export function brusselsOffsetMinutesAt(utcMs: number): number {
  const d = new Date(utcMs);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AGENDA_TIMEZONE,
    timeZoneName: 'shortOffset',
  }).formatToParts(d);
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1';
  const m = tz.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!m) return 60;
  const sign = m[1] === '+' ? 1 : -1;
  const hours = parseInt(m[2], 10);
  const mins = parseInt(m[3] || '0', 10);
  return sign * (hours * 60 + mins);
}

/**
 * Combineert kalenderdag + kloktijd in België tot één UTC-instant (voor `startAt` / `endAt`).
 * Vervangt de oude `combineUtc` die lokale tijd ten onrechte als UTC opsloeg (+2 uur in de UI).
 */
export function combineBrusselsLocalToUtc(slotDate: Date, timeStr: string): Date {
  const ymd = slotDateToYmd(slotDate);
  const full = normTimePlain(timeStr);
  const [hh, mm, ss] = full.split(':').map((x) => parseInt(x, 10));
  const [y, mo, da] = ymd.split('-').map((x) => parseInt(x, 10));
  const wallAsUtc = Date.UTC(y, mo - 1, da, hh, mm, ss || 0);
  const offMin = brusselsOffsetMinutesAt(wallAsUtc);
  return new Date(wallAsUtc - offMin * 60 * 1000);
}

export function timeStringToMinutes(t: string): number {
  const n = normTimePlain(t);
  const [h, m] = n.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export function ymdEuropeBrussels(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AGENDA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Ondergrenzen voor DB @db.Date-range queries (MySQL leest DATE als UTC-middernacht). */
export function parseYmdDayStart(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function parseYmdDayEnd(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999Z`);
}

export function slotDateDayRange(slotDate: Date): { gte: Date; lte: Date } {
  const ymd = slotDateToYmd(slotDate);
  return { gte: parseYmdDayStart(ymd), lte: parseYmdDayEnd(ymd) };
}
