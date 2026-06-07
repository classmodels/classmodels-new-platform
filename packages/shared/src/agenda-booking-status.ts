/** Nederlandse statusbenamingen (admin + planning). */
export const AGENDA_BOOKING_STATUS_OPTS = [
  { v: 'pending', label: 'Afspraak' },
  { v: 'confirmed', label: 'Ingeschreven' },
  { v: 'acknowledged', label: 'Komst bevestigd' },
  { v: 'attended', label: 'Langs geweest' },
  { v: 'cancelled', label: 'Geannuleerd' },
  { v: 'cancelled_cm', label: 'Geannuleerd (CM)' },
  { v: 'no_show', label: 'Niet ingeschreven' },
] as const;

export type AgendaBookingStatusValue = (typeof AGENDA_BOOKING_STATUS_OPTS)[number]['v'];

export function agendaBookingStatusLabel(status: string): string {
  const row = AGENDA_BOOKING_STATUS_OPTS.find((o) => o.v === status);
  return row?.label ?? status;
}
