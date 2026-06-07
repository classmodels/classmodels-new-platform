/** Vergelijking vóór/na admin-wijziging voor meldingen naar klant. */

import { slotDateToYmd } from './agenda-brussels-time';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Afspraak',
  confirmed: 'Ingeschreven',
  acknowledged: 'Komst bevestigd',
  attended: 'Langs geweest',
  cancelled: 'Geannuleerd',
  cancelled_cm: 'Geannuleerd (CM)',
  no_show: 'Niet ingeschreven',
};

export function agendaBookingStatusLabelNl(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export type BookingChangeSnapshot = {
  calendarTitle: string;
  slotDateYmd: string;
  startTime: string;
  endTime: string;
  status: string;
};

export type BookingChangeLine = {
  label: string;
  from: string;
  to: string;
};

function normTimeHm(raw: string): string {
  const p = String(raw ?? '').trim().slice(0, 5);
  const m = p.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return p;
  return `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}`;
}

export function formatBookingDateNl(ymd: string): string {
  const t = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const [y, mo, d] = t.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, mo - 1, d);
  try {
    return new Intl.DateTimeFormat('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dt);
  } catch {
    return t;
  }
}

export function formatBookingTimeRange(start: string, end: string, showEnd = true): string {
  const st = normTimeHm(start);
  const et = normTimeHm(end);
  return showEnd && et ? `${st} – ${et}` : st;
}

export function bookingChangeSnapshot(input: {
  calendarTitle: string;
  slotDate: Date | string;
  startTime: string;
  endTime: string;
  status: string;
}): BookingChangeSnapshot {
  const slotDateYmd =
    input.slotDate instanceof Date ? slotDateToYmd(input.slotDate) : String(input.slotDate).slice(0, 10);
  return {
    calendarTitle: input.calendarTitle.trim(),
    slotDateYmd,
    startTime: normTimeHm(input.startTime),
    endTime: normTimeHm(input.endTime),
    status: input.status,
  };
}

function pushIfDifferent(
  lines: BookingChangeLine[],
  label: string,
  fromRaw: string,
  toRaw: string,
  format: (v: string) => string = (v) => v,
) {
  if (fromRaw === toRaw) return;
  lines.push({ label, from: format(fromRaw), to: format(toRaw) });
}

export function diffBookingSnapshots(
  before: BookingChangeSnapshot,
  after: BookingChangeSnapshot,
  opts?: { showEndTime?: boolean },
): BookingChangeLine[] {
  const showEnd = opts?.showEndTime !== false;
  const lines: BookingChangeLine[] = [];
  pushIfDifferent(lines, 'Agenda', before.calendarTitle, after.calendarTitle);
  pushIfDifferent(lines, 'Datum', before.slotDateYmd, after.slotDateYmd, formatBookingDateNl);
  const beforeTime = formatBookingTimeRange(before.startTime, before.endTime, showEnd);
  const afterTime = formatBookingTimeRange(after.startTime, after.endTime, showEnd);
  if (beforeTime !== afterTime) {
    lines.push({ label: 'Uur', from: beforeTime, to: afterTime });
  }
  pushIfDifferent(lines, 'Status', before.status, after.status, agendaBookingStatusLabelNl);
  return lines;
}

export function formatBookingChangesPlain(lines: BookingChangeLine[]): string {
  if (!lines.length) return 'Uw afspraakgegevens zijn aangepast door Class-Models.';
  return lines.map((l) => `${l.label}: de afspraak is veranderd van ${l.from} naar ${l.to}`).join('. ');
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function formatBookingChangesHtml(lines: BookingChangeLine[]): string {
  if (!lines.length) {
    return `<p style="margin:0 0 16px;text-align:left;">Uw afspraakgegevens zijn aangepast door Class-Models.</p>`;
  }
  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;"><strong>${escHtml(l.label)}</strong><br/><span style="font-size:14px;color:#18181b;">De afspraak is veranderd van <span style="color:#71717a;">${escHtml(l.from)}</span> naar <strong>${escHtml(l.to)}</strong>.</span></td></tr>`,
    )
    .join('');
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #e4e4e7;border-radius:6px;margin:0 0 16px;background:#fff7ed;"><tr><td style="padding:14px 16px;text-align:left;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9a3412;margin-bottom:4px;">Wat is gewijzigd?</div><p style="margin:0 0 10px;font-size:14px;color:#52525b;">Hieronder ziet u wat er aan uw afspraak is veranderd:</p><table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">${rows}</table></td></tr></table>`;
}
