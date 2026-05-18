'use client';

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { BookingDetailEditor } from '@/components/admin-agenda/BookingDetailEditor';
import {
  planningHideCancelledBooking,
  isCancelledAgendaStatus,
  prepareFieldsJsonForSave,
  validateBookingDetailForSave,
} from '@/lib/agenda-booking-detail';

type Cal = { id: string; slug: string; title: string; color: string; durationMinutes: number; planningTextOnColor?: string | null };

type BookingRow = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  calendar: { id: string; title: string; slug: string; color: string; planningTextOnColor?: string | null };
  slot: { id: string; slotDate: string; startTime: string; endTime: string };
  fieldsJson?: Record<string, unknown>;
};

type BookingDetail = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  name: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  fieldsJson: Record<string, unknown>;
  calendar: { id: string; slug: string; title: string; color: string; planningTextOnColor?: string | null };
  slot: { id: string; slotDate: string; startTime: string; endTime: string };
};

const STATUS_OPTS = [
  { v: 'pending', label: 'Actieve afspraken' },
  { v: 'confirmed', label: 'Ingeschreven' },
  { v: 'acknowledged', label: 'Komst bevestigd' },
  { v: 'attended', label: 'Aanwezig' },
  { v: 'cancelled', label: 'Geannuleerd' },
  { v: 'cancelled_cm', label: 'Geannuleerd (CM)' },
  { v: 'no_show', label: 'Niet ingeschreven' },
] as const;

const GRID_START_H = 8;
const GRID_END_H = 20;
const PX_PER_HOUR = 48;

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

type ListPresetId = 'day' | 'week' | 'month' | 'year' | 'all';

function listRangeForPreset(preset: ListPresetId, refYmd: string): { from: string; to: string } {
  if (preset === 'all') return { from: '2000-01-01', to: '2100-12-31' };
  const [y, mo, d] = refYmd.split('-').map((x) => parseInt(x, 10));
  if (!y || !mo || !d) return { from: refYmd, to: refYmd };
  const ref = new Date(y, mo - 1, d);
  if (preset === 'day') {
    const x = ymd(ref);
    return { from: x, to: x };
  }
  if (preset === 'week') {
    const ws = startOfWeekMonday(ref);
    return { from: ymd(ws), to: ymd(addDays(ws, 6)) };
  }
  if (preset === 'month') {
    const yr = ref.getFullYear();
    const m = ref.getMonth() + 1;
    const last = new Date(yr, m, 0).getDate();
    return { from: `${yr}-${pad2(m)}-01`, to: `${yr}-${pad2(m)}-${pad2(last)}` };
  }
  const yr = ref.getFullYear();
  return { from: `${yr}-01-01`, to: `${yr}-12-31` };
}

function planningBlockTextClass(cal: { planningTextOnColor?: string | null }, grey: boolean): string {
  if (grey) return 'text-white';
  return cal.planningTextOnColor === 'black' ? 'text-zinc-950' : 'text-white';
}

function planningBlockStrikeClass(cal: { planningTextOnColor?: string | null }, grey: boolean): string {
  if (grey) return 'line-through decoration-white/90';
  return cal.planningTextOnColor === 'black' ? 'line-through decoration-zinc-900/55' : 'line-through decoration-white/90';
}

function bookingLabel(status: string): string {
  const m: Record<string, string> = {
    pending: 'Afspraak',
    confirmed: 'Ingeschreven',
    acknowledged: 'Komst bevestigd',
    attended: 'Aanwezig',
    cancelled: 'Geannuleerd',
    cancelled_cm: 'Geannuleerd (CM)',
    no_show: 'Niet ingeschreven',
  };
  return m[status] ?? status;
}

function blockStyleForBooking(b: BookingRow, dayYmd: string): { top: number; height: number } | null {
  if (new Date(b.startAt).toISOString().slice(0, 10) !== dayYmd) return null;
  const s = new Date(b.startAt);
  const e = new Date(b.endAt);
  const startMin = (s.getHours() - GRID_START_H) * 60 + s.getMinutes();
  const endMin = (e.getHours() - GRID_START_H) * 60 + e.getMinutes();
  const totalMin = (GRID_END_H - GRID_START_H) * 60;
  if (endMin <= 0 || startMin >= totalMin) return null;
  const top = Math.max(0, startMin / totalMin);
  const bot = Math.min(totalMin, endMin) / totalMin;
  const height = Math.max(bot - top, 0.02);
  return { top: top * 100, height: height * 100 };
}

function nowLinePercentForDay(day: Date): number | null {
  const now = new Date();
  if (ymd(now) !== ymd(day)) return null;
  const startMin = (now.getHours() - GRID_START_H) * 60 + now.getMinutes();
  const totalMin = (GRID_END_H - GRID_START_H) * 60;
  if (startMin < 0 || startMin > totalMin) return null;
  return (startMin / totalMin) * 100;
}

/** Meerdere boekingen op hetzelfde tijdslot (zelfde slot-id) groeperen voor week/dag-weergave. */
function clusterBookingsSameSlot(bookings: BookingRow[]): BookingRow[][] {
  const m = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const k =
      b.slot?.id ||
      `${b.startAt.slice(0, 16)}_${b.endAt.slice(0, 16)}_${b.calendar.id}`;
    const arr = m.get(k) ?? [];
    arr.push(b);
    m.set(k, arr);
  }
  return Array.from(m.values());
}

export default function AdminAgendaPlanningPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [selectedInitialized, setSelectedInitialized] = useState(false);
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('week');
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [listPreset, setListPreset] = useState<ListPresetId>('week');
  const [listFrom, setListFrom] = useState(() => ymd(startOfWeekMonday(new Date())));
  const [listTo, setListTo] = useState(() => ymd(addDays(startOfWeekMonday(new Date()), 6)));
  const [statusSel, setStatusSel] = useState<Set<string>>(
    () => new Set(['pending', 'confirmed', 'acknowledged', 'attended', 'cancelled', 'cancelled_cm']),
  );
  const [mailCols, setMailCols] = useState<Set<string>>(
    () => new Set(['afspraak', 'naam', 'voornaam', 'email', 'phone', 'leeftijd']),
  );
  const [mailTo, setMailTo] = useState('');
  const [pickerYmd, setPickerYmd] = useState(() => ymd(new Date()));
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [schedCalId, setSchedCalId] = useState('');
  const [schedYmd, setSchedYmd] = useState('');
  const [schedStart, setSchedStart] = useState('');
  const [schedEnd, setSchedEnd] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<null | {
    calendarId: string;
    slotDate: string;
    startTime: string;
    endTime: string;
    name: string;
    email: string;
    firstname: string;
    lastname: string;
    phone: string;
  }>(null);
  const [draftBusy, setDraftBusy] = useState(false);

  const weekStart = useMemo(() => startOfWeekMonday(anchor), [anchor]);

  const queryRange = useMemo(() => {
    if (view === 'list') return { from: listFrom, to: listTo };
    if (view === 'day') {
      const d = ymd(anchor);
      return { from: d, to: d };
    }
    if (view === 'week') {
      return { from: ymd(weekStart), to: ymd(addDays(weekStart, 6)) };
    }
    const y = anchor.getFullYear();
    const m = anchor.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return { from: `${y}-${pad2(m)}-01`, to: `${y}-${pad2(m)}-${pad2(last)}` };
  }, [view, anchor, weekStart, listFrom, listTo]);

  const headerRangeLabel = useMemo(() => {
    const df = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'day') return df.format(anchor);
    if (view === 'week') {
      return `${df.format(weekStart)} – ${df.format(addDays(weekStart, 6))}`;
    }
    if (view === 'list') {
      return `${listFrom.replace(/-/g, '/')} – ${listTo.replace(/-/g, '/')}`;
    }
    return new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' }).format(anchor);
  }, [view, anchor, weekStart, listFrom, listTo]);

  const loadCals = useCallback(async () => {
    if (!token) return;
    const list = await adminFetch<Cal[]>('/admin/agenda/calendars', token);
    setCalendars(list);
  }, [token]);

  const statusesParam = useMemo(() => [...statusSel].join(','), [statusSel]);

  const displayRows = useMemo(
    () => rows.filter((b) => !planningHideCancelledBooking(b.calendar.slug, b.status)),
    [rows],
  );

  const loadBookings = useCallback(async () => {
    if (!token || selected.size === 0) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const ids = [...selected].join(',');
      const q = `/admin/agenda/bookings-range?from=${queryRange.from}&to=${queryRange.to}&calendarIds=${encodeURIComponent(ids)}&statuses=${encodeURIComponent(statusesParam)}`;
      const list = await adminFetch<BookingRow[]>(q, token);
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, selected, queryRange.from, queryRange.to, statusesParam]);

  useEffect(() => {
    loadCals().catch(() => {});
  }, [loadCals]);

  useEffect(() => {
    setSelectedInitialized(false);
  }, [token]);

  useEffect(() => {
    if (!calendars.length || selectedInitialized) return;
    setSelected(new Set(calendars.map((c) => c.id)));
    setSelectedInitialized(true);
  }, [calendars, selectedInitialized]);

  useEffect(() => {
    setPickerYmd(ymd(anchor));
  }, [anchor]);

  useEffect(() => {
    loadBookings().catch(() => setRows([]));
  }, [loadBookings]);

  const toggleCal = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleStatus = (v: string) => {
    setStatusSel((prev) => {
      const n = new Set(prev);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  };

  const dfDay = useMemo(
    () => new Intl.DateTimeFormat('nl-BE', { weekday: 'short', day: '2-digit', month: '2-digit' }),
    [],
  );
  const dfDayLong = useMemo(
    () => new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [],
  );
  const dfTime = useMemo(() => new Intl.DateTimeFormat('nl-BE', { hour: '2-digit', minute: '2-digit' }), []);

  const byDay = useMemo(() => {
    const m = new Map<string, BookingRow[]>();
    for (const b of displayRows) {
      const key = new Date(b.startAt).toISOString().slice(0, 10);
      const prev = m.get(key) ?? [];
      prev.push(b);
      m.set(key, prev);
    }
    for (const [, list] of m) list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return m;
  }, [displayRows]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const monthMatrix = useMemo(() => {
    const y = anchor.getFullYear();
    const mo = anchor.getMonth() + 1;
    const first = new Date(y, mo - 1, 1);
    const startPad = (first.getDay() + 6) % 7;
    const lastDay = new Date(y, mo, 0).getDate();
    const cells: ({ ymd: string; inMonth: boolean } | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= lastDay; d++) {
      cells.push({ ymd: `${y}-${pad2(mo)}-${pad2(d)}`, inMonth: true });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rowsM: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) rowsM.push(cells.slice(i, i + 7));
    return rowsM;
  }, [anchor]);

  const applyPicker = () => {
    const [y, m, d] = pickerYmd.split('-').map((x) => parseInt(x, 10));
    if (!y || !m || !d) return;
    setAnchor(new Date(y, m - 1, d));
    if (view === 'list') {
      const r = listRangeForPreset(listPreset, pickerYmd);
      setListFrom(r.from);
      setListTo(r.to);
      return;
    }
    const ws = startOfWeekMonday(new Date(y, m - 1, d));
    setListFrom(ymd(ws));
    setListTo(ymd(addDays(ws, 6)));
  };

  const goToday = () => {
    const t = new Date();
    setAnchor(t);
    const py = ymd(t);
    setPickerYmd(py);
    if (view === 'list') {
      const r = listRangeForPreset(listPreset, py);
      setListFrom(r.from);
      setListTo(r.to);
    } else {
      const ws = startOfWeekMonday(t);
      setListFrom(ymd(ws));
      setListTo(ymd(addDays(ws, 6)));
    }
  };

  const listNavShift = (dir: -1 | 1) => {
    if (listPreset === 'all') return;
    const [y, m, d] = pickerYmd.split('-').map((x) => parseInt(x, 10));
    let ref = new Date(y, m - 1, d);
    if (listPreset === 'day') ref = addDays(ref, dir);
    else if (listPreset === 'week') ref = addDays(ref, dir * 7);
    else if (listPreset === 'month') ref = addMonths(ref, dir);
    else ref = new Date(y + dir, m - 1, d);
    const nextYmd = ymd(ref);
    setPickerYmd(nextYmd);
    const r = listRangeForPreset(listPreset, nextYmd);
    setListFrom(r.from);
    setListTo(r.to);
  };

  const mailBodyLines = useMemo(() => {
    return displayRows.map((b) => {
      const nm = b.name || [b.firstname, b.lastname].filter(Boolean).join(' ') || '—';
      const parts: string[] = [];
      if (mailCols.has('afspraak')) parts.push(b.calendar.title);
      if (mailCols.has('naam')) parts.push(nm);
      if (mailCols.has('voornaam')) parts.push(b.firstname ?? '');
      if (mailCols.has('email')) parts.push(b.email ?? '');
      if (mailCols.has('phone')) parts.push(b.phone ?? '');
      if (mailCols.has('leeftijd')) {
        const fj = b.fieldsJson as Record<string, string> | undefined;
        parts.push((fj?.geboortedatum as string) || (fj?.leeftijd as string) || '');
      }
      return parts.filter(Boolean).join(' · ');
    });
  }, [displayRows, mailCols]);

  const mailList = () => {
    const subject = `Afspraken ${queryRange.from} – ${queryRange.to}`;
    const body = mailBodyLines.join('\n') || '(geen afspraken)';
    const href = `mailto:${encodeURIComponent(mailTo.trim() || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  const print = () => window.print();

  const openDetail = async (id: string) => {
    if (!token) return;
    setDraft(null);
    setDetailLoading(true);
    setDetailErr(null);
    setDetail(null);
    try {
      const b = await adminFetch<BookingDetail>(`/admin/agenda/bookings/${id}`, token);
      const fj =
        b.fieldsJson && typeof b.fieldsJson === 'object' && !Array.isArray(b.fieldsJson)
          ? (b.fieldsJson as Record<string, unknown>)
          : {};
      setDetail({ ...b, fieldsJson: fj });
      setSchedCalId(b.calendar.id);
      setSchedYmd(b.slot.slotDate.slice(0, 10));
      setSchedStart(b.slot.startTime.slice(0, 5));
      setSchedEnd(b.slot.endTime.slice(0, 5));
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : 'Laden mislukt');
    } finally {
      setDetailLoading(false);
    }
  };

  const saveDetail = async () => {
    if (!token || !detail) return;
    const preparedFj = prepareFieldsJsonForSave(detail.fieldsJson);
    const vErr = validateBookingDetailForSave({
      name: detail.name,
      firstname: detail.firstname,
      lastname: detail.lastname,
      email: detail.email,
      phone: detail.phone,
      status: detail.status,
      fieldsJson: preparedFj,
    });
    if (vErr) {
      setDetailErr(vErr);
      return;
    }
    setSaving(true);
    setDetailErr(null);
    try {
      await adminFetch(`/admin/agenda/bookings/${detail.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          status: detail.status,
          name: detail.name,
          firstname: detail.firstname,
          lastname: detail.lastname,
          email: detail.email,
          phone: detail.phone,
          fieldsJson: preparedFj,
          calendarId: schedCalId,
          slotDate: schedYmd,
          startTime: schedStart,
          endTime: schedEnd,
        }),
      });
      setDetail(null);
      await loadBookings();
      router.refresh();
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const deleteDetail = async () => {
    if (!token || !detail) return;
    if (!window.confirm('Deze boeking definitief verwijderen?')) return;
    setSaving(true);
    setDetailErr(null);
    try {
      await adminFetch(`/admin/agenda/bookings/${detail.id}`, token, { method: 'DELETE' });
      setDetail(null);
      setDraft(null);
      await loadBookings();
      router.refresh();
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : 'Verwijderen mislukt');
    } finally {
      setSaving(false);
    }
  };

  const gridHeightPx = (GRID_END_H - GRID_START_H) * PX_PER_HOUR;

  const openManualSlot = (dayYmd: string, e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = Math.max(0, Math.min(1, y / rect.height));
    const totalGridMin = (GRID_END_H - GRID_START_H) * 60;
    const minutesFromGridStart = pct * totalGridMin;
    const snapped = Math.round(minutesFromGridStart / 30) * 30;
    const absMin = GRID_START_H * 60 + snapped;
    let H = Math.floor(absMin / 60);
    let M = absMin % 60;
    if (H >= GRID_END_H) {
      H = GRID_END_H - 1;
      M = 30;
    }
    const firstCal = calendars.find((c) => selected.has(c.id)) ?? calendars[0];
    if (!firstCal) return;
    const hh = pad2(H);
    const mm = pad2(M);
    const startTime = `${parseInt(hh, 10)}:${mm}`;
    const dur = firstCal.durationMinutes ?? 60;
    const [h0, m0] = [H, M];
    let endMinTotal = h0 * 60 + m0 + dur;
    if (endMinTotal >= 24 * 60) endMinTotal = 24 * 60 - 1;
    const endH = Math.floor(endMinTotal / 60);
    const endM = endMinTotal % 60;
    const endTime = `${endH}:${pad2(endM)}`;
    setDetail(null);
    setDetailErr(null);
    setDraft({
      calendarId: firstCal.id,
      slotDate: dayYmd,
      startTime,
      endTime,
      name: 'Handmatig',
      email: '',
      firstname: '',
      lastname: '',
      phone: '',
    });
  };

  const submitDraft = async () => {
    if (!token || !draft) return;
    const missing: string[] = [];
    if (!draft.name.trim()) missing.push('naam');
    if (!draft.firstname.trim()) missing.push('voornaam');
    if (!draft.lastname.trim()) missing.push('familienaam');
    if (!draft.email.trim() || !draft.email.includes('@')) missing.push('e-mail');
    if (!draft.phone.trim()) missing.push('GSM');
    if (missing.length) {
      setDetailErr(`Verplicht invullen: ${missing.join(', ')}.`);
      return;
    }
    setDraftBusy(true);
    setDetailErr(null);
    try {
      await adminFetch('/admin/agenda/manual-booking', token, {
        method: 'POST',
        body: JSON.stringify({
          calendarId: draft.calendarId,
          slotDate: draft.slotDate,
          startTime: draft.startTime,
          endTime: draft.endTime,
          name: draft.name.trim() || 'Handmatig',
          email: draft.email.trim(),
          firstname: draft.firstname.trim(),
          lastname: draft.lastname.trim(),
          phone: draft.phone.trim(),
        }),
      });
      setDraft(null);
      await loadBookings();
      router.refresh();
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : 'Mislukt');
    } finally {
      setDraftBusy(false);
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <section className="no-print rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Agenda&apos;s in beeld</h2>
        <p className="mt-1 text-xs text-muted">
          Standaard staan alle agenda&apos;s aan; vink uit om te verbergen in het rooster.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {calendars.map((c) => {
            const on = selected.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCal(c.id)}
                className={[
                  'rounded-lg border px-3 py-2 text-left text-xs font-medium transition',
                  on ? 'border-zinc-900 text-white shadow-sm' : 'border-line bg-white text-ink hover:bg-panel',
                ].join(' ')}
                style={on ? { backgroundColor: c.color, borderColor: c.color } : undefined}
              >
                {c.title}
              </button>
            );
          })}
        </div>
      </section>

      {selected.size === 0 ? (
        <p className="text-sm text-muted">Selecteer minstens één agenda.</p>
      ) : (
        <>
          <section className="no-print space-y-3 rounded-md border border-line bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded border border-line px-2 py-1 text-xs"
                onClick={() => {
                  if (view === 'list') listNavShift(-1);
                  else
                    setAnchor((a) => {
                      if (view === 'day') return addDays(a, -1);
                      if (view === 'month') return addMonths(a, -1);
                      return addDays(a, -7);
                    });
                }}
              >
                ‹
              </button>
              <input
                type="date"
                className="rounded border border-line px-2 py-1 text-xs"
                value={pickerYmd}
                onChange={(e) => setPickerYmd(e.target.value)}
              />
              <button type="button" className="rounded border border-line px-2 py-1 text-xs" onClick={goToday}>
                Vandaag
              </button>
              <button
                type="button"
                className="rounded border border-line px-2 py-1 text-xs"
                onClick={() => {
                  if (view === 'list') listNavShift(1);
                  else
                    setAnchor((a) => {
                      if (view === 'day') return addDays(a, 1);
                      if (view === 'month') return addMonths(a, 1);
                      return addDays(a, 7);
                    });
                }}
              >
                ›
              </button>
              <h1 className="ml-2 text-center text-base font-bold capitalize text-ink md:flex-1">{headerRangeLabel}</h1>
              <div className="flex flex-wrap gap-1">
                {(['month', 'week', 'day', 'list'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`rounded px-2 py-1 text-xs capitalize ${view === v ? 'bg-zinc-200 font-semibold' : 'border border-line'}`}
                    onClick={() => {
                      setView(v);
                      if (v === 'list') {
                        const r = listRangeForPreset(listPreset, pickerYmd);
                        setListFrom(r.from);
                        setListTo(r.to);
                      }
                    }}
                  >
                    {v === 'month' ? 'Maand' : v === 'week' ? 'Week' : v === 'day' ? 'Dag' : 'Lijst'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="rounded bg-[#000b2b] px-3 py-1.5 text-xs font-medium text-white"
                onClick={applyPicker}
              >
                Toepassen
              </button>
            </div>

            {view === 'list' ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <span className="text-[11px] font-medium text-muted">Lijst — periode</span>
                {(
                  [
                    { id: 'day' as const, label: 'Deze dag' },
                    { id: 'week' as const, label: 'Week' },
                    { id: 'month' as const, label: 'Maand' },
                    { id: 'year' as const, label: 'Jaar' },
                    { id: 'all' as const, label: 'Alles' },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={[
                      'rounded px-2 py-1 text-[11px] font-medium',
                      listPreset === o.id ? 'bg-zinc-200 text-ink' : 'border border-line bg-white text-ink hover:bg-panel',
                    ].join(' ')}
                    onClick={() => {
                      setListPreset(o.id);
                      const r = listRangeForPreset(o.id, pickerYmd);
                      setListFrom(r.from);
                      setListTo(r.to);
                    }}
                  >
                    {o.label}
                  </button>
                ))}
                <span className="text-[10px] text-muted">Datum hierboven = referentie voor dag/week/maand/jaar.</span>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-line bg-panel px-2 py-0.5 text-[11px] font-medium text-ink"
                  onClick={() => setStatusSel(new Set(STATUS_OPTS.map((x) => x.v)))}
                >
                  Alle statussen tonen
                </button>
                <button
                  type="button"
                  className="rounded border border-line bg-panel px-2 py-0.5 text-[11px] font-medium text-ink"
                  onClick={() =>
                    setStatusSel(new Set(['pending', 'confirmed', 'acknowledged', 'attended']))
                  }
                >
                  Alleen actieve
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {STATUS_OPTS.map((o) => (
                  <label key={o.v} className="flex items-center gap-1 text-[11px] text-ink">
                    <input type="checkbox" checked={statusSel.has(o.v)} onChange={() => toggleStatus(o.v)} />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            <details className="no-print border-t border-line pt-3">
              <summary className="cursor-pointer text-xs font-medium text-burgundy underline underline-offset-2">
                Acties — mail &amp; afdrukken
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-[11px] text-muted">
                    Mail lijst naar
                    <input
                      type="email"
                      className="ml-1 w-48 rounded border border-line px-2 py-1 text-xs"
                      placeholder="e-mailadres"
                      value={mailTo}
                      onChange={(e) => setMailTo(e.target.value)}
                    />
                  </label>
                  {(
                    [
                      ['afspraak', 'Afspraak'],
                      ['naam', 'Naam'],
                      ['voornaam', 'Voornaam'],
                      ['email', 'E-mail'],
                      ['phone', 'Telefoon/GSM'],
                      ['leeftijd', 'Leeftijd'],
                    ] as const
                  ).map(([k, lab]) => (
                    <label key={k} className="flex items-center gap-1 text-[11px]">
                      <input
                        type="checkbox"
                        checked={mailCols.has(k)}
                        onChange={() =>
                          setMailCols((prev) => {
                            const n = new Set(prev);
                            if (n.has(k)) n.delete(k);
                            else n.add(k);
                            return n;
                          })
                        }
                      />
                      {lab}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded bg-[#000b2b] px-3 py-1.5 text-xs font-medium text-white"
                    onClick={mailList}
                  >
                    Mail geselecteerde lijst
                  </button>
                  <button type="button" className="rounded border border-line px-3 py-1.5 text-xs" onClick={print}>
                    Afdrukken
                  </button>
                </div>
              </div>
            </details>
          </section>

          {loading ? <p className="text-xs text-muted">Laden…</p> : null}
          {!loading && selected.size > 0 ? (
            <p className="text-xs text-muted">
              <strong className="text-ink">{displayRows.length}</strong> afspraak{displayRows.length !== 1 ? 'en' : ''} in dit
              bereik — elke boeking telt apart (ook op hetzelfde uur).
            </p>
          ) : null}

          <div className="min-w-0 space-y-4">
              {view === 'month' ? (
                <div className="overflow-x-auto rounded-md border border-line bg-white shadow-sm">
                  <div className="grid grid-cols-7 border-b border-line bg-panel text-center text-[11px] font-semibold">
                    {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((d) => (
                      <div key={d} className="border-r border-line py-2 last:border-r-0">
                        {d}
                      </div>
                    ))}
                  </div>
                  {monthMatrix.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 border-b border-line last:border-b-0">
                      {week.map((cell, ci) => {
                        if (!cell) return <div key={ci} className="min-h-[100px] border-r border-line bg-zinc-50/50" />;
                        const list = byDay.get(cell.ymd) ?? [];
                        const wend = new Date(cell.ymd + 'T12:00:00').getDay();
                        const weekend = wend === 0 || wend === 6;
                        return (
                          <div
                            key={ci}
                            className={`min-h-[100px] border-r border-line p-1 text-[10px] last:border-r-0 ${weekend ? 'bg-amber-50/60' : ''}`}
                          >
                            <div className="font-semibold text-ink">{parseInt(cell.ymd.slice(8), 10)}</div>
                            <div className="mt-1 max-h-[200px] space-y-0.5 overflow-y-auto pr-0.5">
                              {list.map((b) => {
                                const nm = b.name || [b.firstname, b.lastname].filter(Boolean).join(' ') || '—';
                                const struck = isCancelledAgendaStatus(b.status);
                                const grey = struck || b.status === 'no_show';
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => openDetail(b.id)}
                                    className={`block w-full rounded px-1 py-0.5 text-left text-[9px] leading-tight ${planningBlockTextClass(b.calendar, grey)} ${grey ? 'bg-zinc-400' : ''} ${struck ? planningBlockStrikeClass(b.calendar, grey) : ''}`}
                                    style={grey ? undefined : { backgroundColor: b.calendar.color }}
                                  >
                                    <div>
                                      {b.slot.startTime.slice(0, 5)} – {b.slot.endTime.slice(0, 5)}
                                    </div>
                                    <div className="font-medium">{b.calendar.title}</div>
                                    <div className="opacity-90">{nm}</div>
                                    <div className="opacity-80">Status: {bookingLabel(b.status)}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : null}

              {(view === 'week' || view === 'day') ? (
                <div className="overflow-x-auto rounded-md border border-line bg-white shadow-sm">
                  <div className="flex">
                    <div className="w-14 shrink-0 border-r border-line bg-panel pt-8">
                      {Array.from({ length: GRID_END_H - GRID_START_H }, (_, i) => GRID_START_H + i).map((h) => (
                        <div
                          key={h}
                          style={{ height: PX_PER_HOUR }}
                          className="border-b border-dotted border-zinc-200 pr-1 text-right text-[10px] text-muted"
                        >
                          {pad2(h)}:00
                        </div>
                      ))}
                    </div>
                    <div className={`grid flex-1 ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'}`}>
                      {(view === 'day' ? [anchor] : weekDays).map((d) => {
                        const key = ymd(d);
                        const list = byDay.get(key) ?? [];
                        const wend = d.getDay();
                        const weekend = wend === 0 || wend === 6;
                        const nowPct = nowLinePercentForDay(d);
                        return (
                          <div
                            key={key}
                            className={`border-r border-line last:border-r-0 ${weekend ? 'bg-amber-50/50' : 'bg-[#fffef5]'}`}
                          >
                            <div className="sticky top-0 z-10 border-b border-line bg-white/90 px-1 py-1 text-center text-[10px] font-semibold capitalize">
                              {dfDay.format(d)}
                            </div>
                            <div
                              className="relative cursor-crosshair"
                              style={{ height: gridHeightPx }}
                              role="presentation"
                              onClick={(e) => openManualSlot(key, e)}
                            >
                              {Array.from({ length: (GRID_END_H - GRID_START_H) * 2 }, (_, i) => i).map((i) => (
                                <div
                                  key={i}
                                  className={`absolute left-0 right-0 border-b ${i % 2 === 0 ? 'border-zinc-200' : 'border-dotted border-zinc-100'}`}
                                  style={{ top: (i * PX_PER_HOUR) / 2, height: PX_PER_HOUR / 2 }}
                                />
                              ))}
                              {clusterBookingsSameSlot(list).map((cluster) => {
                                const first = cluster[0];
                                const st = blockStyleForBooking(first, key);
                                if (!st) return null;
                                const groupKey = cluster.map((c) => c.id).join('-');
                                return (
                                  <div
                                    key={groupKey}
                                    className="absolute left-0.5 right-0.5 z-[5] flex min-h-[18px] flex-row gap-px"
                                    style={{ top: `${st.top}%`, height: `${st.height}%` }}
                                  >
                                    {cluster.map((b) => {
                                      const nm = b.name || [b.firstname, b.lastname].filter(Boolean).join(' ') || '—';
                                      const struck = isCancelledAgendaStatus(b.status);
                                      const grey = struck || b.status === 'no_show';
                                      return (
                                        <button
                                          key={b.id}
                                          type="button"
                                          onClick={() => openDetail(b.id)}
                                          title={`${nm} — ${bookingLabel(b.status)}`}
                                          className={`min-h-0 min-w-0 flex-1 overflow-hidden rounded px-0.5 py-0.5 text-left text-[8px] leading-tight shadow-sm sm:text-[9px] ${planningBlockTextClass(b.calendar, grey)} ${grey ? 'bg-zinc-400' : ''} ${struck ? planningBlockStrikeClass(b.calendar, grey) : ''}`}
                                          style={grey ? undefined : { backgroundColor: b.calendar.color }}
                                        >
                                          <div className="font-semibold">
                                            {dfTime.format(new Date(b.startAt))} – {dfTime.format(new Date(b.endAt))}
                                          </div>
                                          <div className="truncate">{b.calendar.title}</div>
                                          <div className="truncate italic opacity-95">{nm}</div>
                                          <div className="opacity-80">{bookingLabel(b.status)}</div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {nowPct != null ? (
                                <div
                                  className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                                  style={{ top: `${nowPct}%` }}
                                >
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" />
                                  <span className="h-px w-full bg-red-600" />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {view === 'list' ? (
                <div className="space-y-4">
                  {Array.from(byDay.keys())
                    .sort()
                    .map((dayKey) => (
                      <div key={dayKey}>
                        <p className="border-b border-line pb-1 text-sm font-semibold capitalize text-ink">
                          {dfDayLong.format(new Date(dayKey + 'T12:00:00'))}
                        </p>
                        <div className="mt-2 space-y-2">
                          {(byDay.get(dayKey) ?? []).map((b) => {
                            const nm = b.name || [b.firstname, b.lastname].filter(Boolean).join(' ') || '—';
                            const struck = isCancelledAgendaStatus(b.status);
                            const grey = struck || b.status === 'no_show';
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => openDetail(b.id)}
                                className={`flex w-full items-start gap-3 rounded-md border-l-4 border-black px-3 py-2 text-left text-sm shadow-sm ${grey ? 'bg-zinc-200' : 'bg-emerald-100'} ${struck ? 'line-through' : ''}`}
                              >
                                <span className="shrink-0 font-medium text-ink">
                                  {b.slot.startTime.slice(0, 5)} – {b.slot.endTime.slice(0, 5)}
                                </span>
                                <span className="font-medium text-ink">{b.calendar.title}</span>
                                <span className="ml-auto italic text-ink">{nm}</span>
                                <span className="text-xs text-muted">{bookingLabel(b.status)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  {!displayRows.length ? <p className="text-sm text-muted">Geen afspraken in dit bereik.</p> : null}
                </div>
              ) : null}
            </div>
        </>
      )}

      {detail || detailLoading || draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            {detailLoading ? <p className="text-sm text-muted">Laden…</p> : null}
            {detailErr ? <p className="text-sm text-red-600">{detailErr}</p> : null}
            {draft ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-ink">Nieuwe handmatige afspraak</h3>
                    <p className="mt-1 text-xs text-muted">Pas datum, uren en agenda aan — ook buiten het vaste rooster.</p>
                  </div>
                  <button
                    type="button"
                    className="text-2xl leading-none text-zinc-400 hover:text-ink"
                    onClick={() => {
                      setDraft(null);
                      setDetailErr(null);
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="text-xs text-muted">
                    Agenda
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                      value={draft.calendarId}
                      onChange={(e) => setDraft({ ...draft, calendarId: e.target.value })}
                    >
                      {(calendars.some((c) => selected.has(c.id)) ? calendars.filter((c) => selected.has(c.id)) : calendars).map(
                        (c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="text-xs text-muted">
                    Dag
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                      value={draft.slotDate}
                      onChange={(e) => setDraft({ ...draft, slotDate: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-muted">
                    Van (HH:mm)
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                      value={draft.startTime}
                      onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-muted">
                    Tot (HH:mm)
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                      value={draft.endTime}
                      onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-muted">
                    Naam op de planning
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-muted">
                    Voornaam
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                      value={draft.firstname}
                      onChange={(e) => setDraft({ ...draft, firstname: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-muted">
                    Familienaam
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                      value={draft.lastname}
                      onChange={(e) => setDraft({ ...draft, lastname: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-muted">
                    E-mail <span className="text-red-600">*</span>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                      value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-muted">
                    GSM <span className="text-red-600">*</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                    />
                  </label>
                </div>
                <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                  <button
                    type="button"
                    className="rounded-lg border border-line px-4 py-2 text-sm"
                    onClick={() => {
                      setDraft(null);
                      setDetailErr(null);
                    }}
                  >
                    Annuleren
                  </button>
                  <button
                    type="button"
                    disabled={draftBusy}
                    className="rounded-lg bg-[#000b2b] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    onClick={() => void submitDraft()}
                  >
                    {draftBusy ? 'Bezig…' : 'Opslaan'}
                  </button>
                </div>
              </>
            ) : null}
            {detail ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-ink">Bewerk reserveringsdetails</h3>
                    <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-muted">
                      {detail.calendar.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-2xl leading-none text-zinc-400 hover:text-ink"
                    onClick={() => {
                      setDetail(null);
                      setDetailErr(null);
                    }}
                  >
                    ×
                  </button>
                </div>
                <BookingDetailEditor
                  detail={detail}
                  onDetailChange={(next) => setDetail(next)}
                  schedCalId={schedCalId}
                  setSchedCalId={setSchedCalId}
                  schedYmd={schedYmd}
                  setSchedYmd={setSchedYmd}
                  schedStart={schedStart}
                  setSchedStart={setSchedStart}
                  schedEnd={schedEnd}
                  setSchedEnd={setSchedEnd}
                  calendars={calendars.map((c) => ({ id: c.id, title: c.title }))}
                  statusOpts={STATUS_OPTS}
                />
                <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-line pt-4">
                  <button
                    type="button"
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    onClick={deleteDetail}
                    disabled={saving}
                  >
                    Afspraak verwijderen
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-[#000b2b] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    onClick={saveDetail}
                    disabled={saving}
                  >
                    {saving ? 'Bezig…' : 'Opslaan'}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
