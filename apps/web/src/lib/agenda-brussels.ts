/** Agenda-weergave: zelfde logica als API — Europe/Brussels. */

export const AGENDA_TIMEZONE = 'Europe/Brussels';

export function ymdEuropeBrussels(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AGENDA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function slotDateKey(slotDate: string): string {
  return slotDate.slice(0, 10);
}

export function timeStringToMinutes(t: string): number {
  const s = t.trim().slice(0, 8);
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function formatSlotTimeRange(startTime: string, endTime: string): string {
  return `${startTime.slice(0, 5)} – ${endTime.slice(0, 5)}`;
}

export function formatSlotDateTimeNl(slotDate: string, startTime: string): string {
  const [y, mo, d] = slotDate.slice(0, 10).split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, mo - 1, d, 12, 0, 0);
  const day = new Intl.DateTimeFormat('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dt);
  return `${day}, ${startTime.slice(0, 5)}`;
}

/** Sorteer op slot-datum + starttijd (niet op UTC `startAt`). */
export function compareBookingsBySlot(
  a: { slot: { slotDate: string; startTime: string } },
  b: { slot: { slotDate: string; startTime: string } },
): number {
  const dk = slotDateKey(a.slot.slotDate).localeCompare(slotDateKey(b.slot.slotDate));
  if (dk !== 0) return dk;
  return a.slot.startTime.localeCompare(b.slot.startTime);
}
