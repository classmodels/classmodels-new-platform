'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { BookingDetailEditor } from '@/components/admin-agenda/BookingDetailEditor';
import { isCancelledAgendaStatus, prepareFieldsJsonForSave, validateBookingDetailForSave } from '@/lib/agenda-booking-detail';

type Cal = {
  id: string;
  slug: string;
  title: string;
  active: boolean;
  capacity: number;
};

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
  calendar: { id: string; slug: string; title: string };
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
  calendar: { id: string; slug: string; title: string; color: string };
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

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

type DatePreset = 'today' | 'week' | 'month' | 'all' | 'custom';

function rangeForPreset(preset: DatePreset, refYmd: string, customFrom: string, customTo: string): { from: string; to: string } {
  if (preset === 'custom') {
    const a = customFrom.trim() || refYmd;
    const b = customTo.trim() || customFrom.trim() || refYmd;
    return a <= b ? { from: a, to: b } : { from: b, to: a };
  }
  if (preset === 'all') return { from: '2000-01-01', to: '2100-12-31' };
  const [y, mo, d] = refYmd.split('-').map((x) => parseInt(x, 10));
  if (!y || !mo || !d) return { from: refYmd, to: refYmd };
  const ref = new Date(y, mo - 1, d);
  if (preset === 'today') {
    const x = ymd(ref);
    return { from: x, to: x };
  }
  if (preset === 'week') {
    const ws = startOfWeekMonday(ref);
    return { from: ymd(ws), to: ymd(addDays(ws, 6)) };
  }
  const yr = ref.getFullYear();
  const m = ref.getMonth() + 1;
  const last = new Date(yr, m, 0).getDate();
  return { from: `${yr}-${pad2(m)}-01`, to: `${yr}-${pad2(m)}-${pad2(last)}` };
}

export default function AdminAgendaBoekingenPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [selectedCalIds, setSelectedCalIds] = useState<Set<string>>(() => new Set());
  const [calsReady, setCalsReady] = useState(false);

  const [refYmd, setRefYmd] = useState(() => ymd(new Date()));
  const [datePreset, setDatePreset] = useState<DatePreset>('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [statusSel, setStatusSel] = useState<Set<string>>(() => new Set(STATUS_OPTS.map((x) => x.v)));

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [schedCalId, setSchedCalId] = useState('');
  const [schedYmd, setSchedYmd] = useState('');
  const [schedStart, setSchedStart] = useState('');
  const [schedEnd, setSchedEnd] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const range = useMemo(
    () => rangeForPreset(datePreset, refYmd, customFrom, customTo),
    [datePreset, refYmd, customFrom, customTo],
  );

  const statusesParam = useMemo(() => [...statusSel].join(','), [statusSel]);

  const loadCals = useCallback(async () => {
    if (!token) return;
    const rows = await adminFetch<Cal[]>('/admin/agenda/calendars', token);
    setCalendars(rows);
    setSelectedCalIds(new Set(rows.map((c) => c.id)));
    setCalsReady(true);
  }, [token]);

  const loadBookings = useCallback(async () => {
    if (!token || !calsReady || selectedCalIds.size === 0) {
      setBookings([]);
      return;
    }
    setLoading(true);
    try {
      const ids = [...selectedCalIds].join(',');
      const q = `/admin/agenda/bookings-range?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&calendarIds=${encodeURIComponent(ids)}&statuses=${encodeURIComponent(statusesParam)}`;
      const rows = await adminFetch<BookingRow[]>(q, token);
      setBookings(rows);
      setSelectedIds(new Set());
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [token, calsReady, selectedCalIds, range.from, range.to, statusesParam]);

  useEffect(() => {
    loadCals().catch(() => {});
  }, [loadCals]);

  useEffect(() => {
    loadBookings().catch(() => setBookings([]));
  }, [loadBookings]);

  const df = useMemo(() => new Intl.DateTimeFormat('nl-BE', { dateStyle: 'medium', timeStyle: 'short' }), []);

  const toggleCal = (id: string) => {
    setSelectedCalIds((prev) => {
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

  const toggleRowSel = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAllVisible = () => {
    if (selectedIds.size === bookings.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(bookings.map((b) => b.id)));
  };

  const bulkDelete = async () => {
    if (!token || selectedIds.size === 0) return;
    if (!window.confirm(`${selectedIds.size} boeking(en) definitief verwijderen?`)) return;
    try {
      await adminFetch('/admin/agenda/bookings/bulk-delete', token, {
        method: 'POST',
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      setSelectedIds(new Set());
      await loadBookings();
      router.refresh();
    } catch {
      /**/
    }
  };

  const openDetail = async (id: string) => {
    if (!token) return;
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

  const closeDetail = () => {
    setDetail(null);
    setDetailErr(null);
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
      const body: Record<string, unknown> = {
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
      };
      await adminFetch(`/admin/agenda/bookings/${detail.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      closeDetail();
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
      closeDetail();
      await loadBookings();
      router.refresh();
    } catch (e) {
      setDetailErr(e instanceof Error ? e.message : 'Verwijderen mislukt');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (p: DatePreset) => {
    setDatePreset(p);
    if (p !== 'custom') {
      const r = rangeForPreset(p, refYmd, customFrom, customTo);
      setCustomFrom(r.from);
      setCustomTo(r.to);
    }
  };

  const onCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDatePreset('custom');
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Filters</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3 text-xs">
          <label className="flex flex-col gap-1 text-muted">
            Referentiedatum
            <input
              type="date"
              className="rounded border border-line px-2 py-1 text-ink"
              value={refYmd}
              onChange={(e) => setRefYmd(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['today', 'Vandaag'],
                ['week', 'Week'],
                ['month', 'Maand'],
                ['all', 'Alles'],
                ['custom', 'Van … tot …'],
              ] as const
            ).map(([id, lab]) => (
              <button
                key={id}
                type="button"
                onClick={() => applyPreset(id)}
                className={`rounded px-2 py-1 font-medium ${
                  datePreset === id ? 'bg-zinc-200 text-ink' : 'border border-line bg-white hover:bg-panel'
                }`}
              >
                {lab}
              </button>
            ))}
          </div>
        </div>
        {datePreset === 'custom' ? (
          <form onSubmit={onCustomSubmit} className="mt-3 flex flex-wrap items-end gap-2 text-xs">
            <label className="text-muted">
              Van
              <input
                type="date"
                className="ml-1 rounded border border-line px-2 py-1"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label className="text-muted">
              Tot
              <input
                type="date"
                className="ml-1 rounded border border-line px-2 py-1"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
            <button type="submit" className="rounded bg-[#000b2b] px-3 py-1 font-medium text-white">
              Toepassen
            </button>
          </form>
        ) : null}
        <p className="mt-2 text-[11px] text-muted">
          Periode: <strong className="text-ink">{range.from}</strong> t/m <strong className="text-ink">{range.to}</strong>
        </p>

        <div className="mt-4 border-t border-line pt-3">
          <p className="text-xs font-medium text-ink">Agenda&apos;s</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {calendars.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCal(c.id)}
                className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${
                  selectedCalIds.has(c.id) ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-line bg-white text-ink'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-line bg-panel px-2 py-0.5 text-[11px]"
              onClick={() => setStatusSel(new Set(STATUS_OPTS.map((x) => x.v)))}
            >
              Alle statussen
            </button>
            <button
              type="button"
              className="rounded border border-line bg-panel px-2 py-0.5 text-[11px]"
              onClick={() => setStatusSel(new Set(['pending', 'confirmed', 'acknowledged', 'attended']))}
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
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Ingeschreven personen / boekingen</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!selectedIds.size}
              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-800 disabled:opacity-40"
              onClick={() => void bulkDelete()}
            >
              Geselecteerd verwijderen ({selectedIds.size})
            </button>
          </div>
        </div>
        {loading ? <p className="mt-2 text-xs text-muted">Laden…</p> : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 pr-2">
                  <input type="checkbox" checked={bookings.length > 0 && selectedIds.size === bookings.length} onChange={toggleAllVisible} />
                </th>
                <th className="py-2 pr-3 font-medium">Moment</th>
                <th className="py-2 pr-3 font-medium">Agenda</th>
                <th className="py-2 pr-3 font-medium">Naam</th>
                <th className="py-2 pr-3 font-medium">Contact</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Actie</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const slotD = b.slot?.slotDate?.slice(0, 10);
                const nm =
                  b.name || [b.firstname, b.lastname].filter(Boolean).join(' ') || '—';
                const struck = isCancelledAgendaStatus(b.status);
                return (
                  <tr key={b.id} className={`border-b border-line/80 ${struck ? 'line-through opacity-80' : ''}`}>
                    <td className="py-2 pr-2 align-top">
                      <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleRowSel(b.id)} />
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <button
                        type="button"
                        className="text-left font-medium text-burgundy underline-offset-2 hover:underline"
                        onClick={() => void openDetail(b.id)}
                      >
                        {df.format(new Date(b.startAt))}
                      </button>
                      {slotD ? (
                        <div className="text-[10px] text-muted">
                          Slot {slotD} {b.slot.startTime?.slice(0, 5)}–{b.slot.endTime?.slice(0, 5)}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 align-top text-muted">{b.calendar.title}</td>
                    <td className="py-2 pr-3 align-top">{nm}</td>
                    <td className="py-2 pr-3 align-top text-muted">
                      {b.email || '—'}
                      {b.phone ? <div>{b.phone}</div> : null}
                    </td>
                    <td className="py-2 align-top">{b.status}</td>
                    <td className="py-2 align-top">
                      <button
                        type="button"
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-800 hover:bg-red-100"
                        onClick={async () => {
                          if (!token) return;
                          if (!window.confirm('Deze boeking definitief verwijderen?')) return;
                          try {
                            await adminFetch(`/admin/agenda/bookings/${b.id}`, token, { method: 'DELETE' });
                            await loadBookings();
                            router.refresh();
                          } catch {
                            /**/
                          }
                        }}
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!bookings.length && !loading ? <p className="mt-4 text-xs text-muted">Geen boekingen in dit bereik.</p> : null}
      </section>

      {detail || detailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            {detailLoading ? <p className="text-sm text-muted">Laden…</p> : null}
            {detailErr ? <p className="text-sm text-red-600">{detailErr}</p> : null}
            {detail ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-ink">Bewerk reserveringsdetails</h3>
                    <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-muted">
                      {detail.calendar.title}
                    </span>
                  </div>
                  <button type="button" className="text-2xl leading-none text-zinc-400 hover:text-ink" onClick={closeDetail}>
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
                    onClick={() => void deleteDetail()}
                    disabled={saving}
                  >
                    Afspraak verwijderen
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-[#000b2b] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    onClick={() => void saveDetail()}
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
