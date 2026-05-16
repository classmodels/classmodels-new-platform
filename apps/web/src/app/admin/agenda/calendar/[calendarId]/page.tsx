'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Cal = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  color: string;
  durationMinutes: number;
  capacity: number;
  active: boolean;
  publicBooking: boolean;
  restrictToOpenDays: boolean;
  sortOrder: number;
  defaultDayStartTime?: string;
  defaultDayEndTime?: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  slotStepMinutes?: number | null;
  optionalSlotStarts?: string | null;
  showEndTimeOnPublic?: boolean;
};

type OpenRow = { id: string; openDate: string; repeatYearly: boolean };

type SlotRow = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status: string;
  booked: number;
  remaining: number;
};

type ClosedRow = { id: string; closedDate: string; reason: string | null };

function toTimeInput(s?: string | null): string {
  if (!s) return '';
  const p = s.slice(0, 5);
  return /^\d{2}:\d{2}$/.test(p) ? p : '';
}

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function minToLabel(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** 30-min rooster tussen dag start/einde; respecteert pauze (geen starts in pauze). */
function halfHourStartsInWindow(
  dayStart: string,
  dayEnd: string,
  appointmentDurMin: number,
  breakStart: string,
  breakEnd: string,
): number[] {
  const startM = timeToMin(dayStart);
  const endM = timeToMin(dayEnd);
  let bs: number | null = null;
  let be: number | null = null;
  if (breakStart && breakEnd) {
    bs = timeToMin(breakStart);
    be = timeToMin(breakEnd);
    if (be <= bs) {
      bs = null;
      be = null;
    }
  }
  const out: number[] = [];
  for (let cur = startM; cur + appointmentDurMin <= endM; cur += 30) {
    if (bs != null && be != null && cur < be && cur + appointmentDurMin > bs) continue;
    out.push(cur);
  }
  return out;
}

function parseOptionalLines(raw: string | null | undefined): Set<number> {
  const s = new Set<number>();
  if (!raw?.trim()) return s;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!/^(\d{1,2}):(\d{2})$/.test(t)) continue;
    s.add(timeToMin(t));
  }
  return s;
}

function monthGrid(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const pad = (first.getDay() + 6) % 7;
  const last = new Date(year, month, 0).getDate();
  const cells: ({ d: number; ymd: string } | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= last; d++) {
    const ymd = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ d, ymd });
  }
  while (cells.length % 7) cells.push(null);
  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const WEEK_OPTS = [
  { v: 1, label: 'Ma' },
  { v: 2, label: 'Di' },
  { v: 3, label: 'Wo' },
  { v: 4, label: 'Do' },
  { v: 5, label: 'Vr' },
  { v: 6, label: 'Za' },
  { v: 0, label: 'Zo' },
];

export default function AdminAgendaCalendarDetailPage() {
  const params = useParams();
  const calendarId = typeof params.calendarId === 'string' ? params.calendarId : '';
  const { token } = useAuth();

  const [cal, setCal] = useState<Cal | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [active, setActive] = useState(true);
  const [publicBooking, setPublicBooking] = useState(true);
  const [restrictToOpenDays, setRestrictToOpenDays] = useState(false);
  const [showEndTimeOnPublic, setShowEndTimeOnPublic] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [slotStepMinutes, setSlotStepMinutes] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [sortOrder, setSortOrder] = useState('100');
  const [color, setColor] = useState('#6f121b');
  const [dayStart, setDayStart] = useState('08:00');
  const [dayEnd, setDayEnd] = useState('18:00');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const [restrictStarts, setRestrictStarts] = useState(false);
  const [selectedStartsMin, setSelectedStartsMin] = useState<Set<number>>(() => new Set());

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [openRows, setOpenRows] = useState<OpenRow[]>([]);
  const [repeatNext, setRepeatNext] = useState(false);

  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [closed, setClosed] = useState<ClosedRow[]>([]);
  const [slotDate, setSlotDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [bulkFrom, setBulkFrom] = useState('');
  const [bulkTo, setBulkTo] = useState('');
  const [bulkStart, setBulkStart] = useState('10:00');
  const [bulkEnd, setBulkEnd] = useState('11:00');
  const [bulkDays, setBulkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [closedDate, setClosedDate] = useState('');
  const [closedReason, setClosedReason] = useState('');

  const chipStarts = useMemo(() => {
    const dur = parseInt(durationMinutes, 10) || 60;
    return halfHourStartsInWindow(dayStart, dayEnd, dur, breakStart, breakEnd);
  }, [dayStart, dayEnd, durationMinutes, breakStart, breakEnd]);

  const applyCalToForm = useCallback((c: Cal) => {
    setTitle(c.title);
    setSlug(c.slug);
    setActive(c.active);
    setPublicBooking(c.publicBooking);
    setRestrictToOpenDays(c.restrictToOpenDays ?? false);
    setShowEndTimeOnPublic(c.showEndTimeOnPublic !== false);
    setDurationMinutes(String(c.durationMinutes));
    setSlotStepMinutes(c.slotStepMinutes != null ? String(c.slotStepMinutes) : '');
    setCapacity(String(c.capacity));
    setSortOrder(String(c.sortOrder));
    setColor(c.color);
    setDayStart(toTimeInput(c.defaultDayStartTime) || '08:00');
    setDayEnd(toTimeInput(c.defaultDayEndTime) || '18:00');
    setBreakStart(toTimeInput(c.breakStart));
    setBreakEnd(toTimeInput(c.breakEnd));
    const hasCustom = !!(c.optionalSlotStarts?.trim());
    setRestrictStarts(hasCustom);
    if (hasCustom) {
      setSelectedStartsMin(parseOptionalLines(c.optionalSlotStarts));
    } else {
      setSelectedStartsMin(new Set());
    }
  }, []);

  const loadCal = useCallback(async () => {
    if (!token || !calendarId) return;
    setLoadErr(null);
    try {
      const rows = await adminFetch<Cal[]>('/admin/agenda/calendars', token);
      const c = rows.find((x) => x.id === calendarId) ?? null;
      setCal(c);
      if (c) applyCalToForm(c);
      else setLoadErr('Agenda niet gevonden.');
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : 'Laden mislukt');
      setCal(null);
    }
  }, [token, calendarId, applyCalToForm]);

  const loadOpen = useCallback(async () => {
    if (!token || !calendarId) return;
    const rows = await adminFetch<OpenRow[]>(
      `/admin/agenda/open-days?calendarId=${encodeURIComponent(calendarId)}`,
      token,
    );
    setOpenRows(rows);
  }, [token, calendarId]);

  const loadSlots = useCallback(async () => {
    if (!token || !calendarId) return;
    const from = new Date();
    const to = new Date();
    to.setUTCDate(to.getUTCDate() + 120);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    const data = await adminFetch<{ slots: SlotRow[] }>(
      `/admin/agenda/slots?calendarId=${encodeURIComponent(calendarId)}&from=${fromStr}&to=${toStr}`,
      token,
    );
    setSlots(data.slots);
  }, [token, calendarId]);

  const loadClosed = useCallback(async () => {
    if (!token || !calendarId) return;
    const rows = await adminFetch<ClosedRow[]>(
      `/admin/agenda/closed-days?calendarId=${encodeURIComponent(calendarId)}`,
      token,
    );
    setClosed(rows);
  }, [token, calendarId]);

  useEffect(() => {
    loadCal().catch(() => {});
  }, [loadCal]);

  useEffect(() => {
    loadOpen().catch(() => setOpenRows([]));
  }, [loadOpen]);

  useEffect(() => {
    loadSlots().catch(() => setSlots([]));
    loadClosed().catch(() => setClosed([]));
  }, [loadSlots, loadClosed]);

  const byYmd = useMemo(() => {
    const m = new Map<string, OpenRow>();
    for (const r of openRows) m.set(r.openDate, r);
    return m;
  }, [openRows]);

  const toggleOpenDay = async (ymd: string) => {
    if (!token || !calendarId) return;
    setMsg(null);
    const existing = byYmd.get(ymd);
    try {
      if (existing) {
        await adminFetch(`/admin/agenda/open-days/${existing.id}`, token, { method: 'DELETE' });
        setMsg('Open dag verwijderd.');
      } else {
        await adminFetch('/admin/agenda/open-days', token, {
          method: 'POST',
          body: JSON.stringify({ calendarId, openDate: ymd, repeatYearly: repeatNext }),
        });
        setMsg(repeatNext ? 'Open gezet (jaarlijks).' : 'Open gezet.');
      }
      await loadOpen();
      await loadSlots();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    }
  };

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !cal) return;
    setMsg(null);
    const dur = parseInt(durationMinutes, 10);
    const cap = parseInt(capacity, 10);
    const sort = parseInt(sortOrder, 10);
    if (restrictStarts && selectedStartsMin.size === 0) {
      setMsg('Selecteer minstens één startuur, of schakel “alleen deze starturen” uit.');
      return;
    }
    const stepRaw = slotStepMinutes.trim();
    const stepParsed = stepRaw ? parseInt(stepRaw, 10) : null;
    let optionalStarts: string | null = null;
    if (restrictStarts) {
      const lines = [...selectedStartsMin].sort((a, b) => a - b).map(minToLabel);
      optionalStarts = lines.length ? lines.join('\n') : null;
    }
    try {
      await adminFetch(`/admin/agenda/calendars/${cal.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          title,
          slug,
          active,
          publicBooking,
          restrictToOpenDays,
          showEndTimeOnPublic,
          durationMinutes: dur,
          slotStepMinutes: stepParsed,
          optionalSlotStarts: optionalStarts,
          capacity: cap,
          sortOrder: sort,
          color,
          defaultDayStartTime: dayStart || undefined,
          defaultDayEndTime: dayEnd || undefined,
          breakStart: breakStart.trim() ? breakStart : null,
          breakEnd: breakEnd.trim() ? breakEnd : null,
        }),
      });
      setMsg('Instellingen opgeslagen.');
      await loadCal();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Opslaan mislukt');
    }
  };

  const toggleStartChip = (m: number) => {
    setSelectedStartsMin((prev) => {
      const n = new Set(prev);
      if (n.has(m)) n.delete(m);
      else n.add(m);
      return n;
    });
  };

  const toggleBulkDay = (v: number) => {
    setBulkDays((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort()));
  };

  const addSlot = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !calendarId || !slotDate) return;
    setMsg(null);
    try {
      await adminFetch('/admin/agenda/slots', token, {
        method: 'POST',
        body: JSON.stringify({ calendarId, slotDate, startTime, endTime }),
      });
      setMsg('Moment toegevoegd.');
      setSlotDate('');
      await loadSlots();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    }
  };

  const addBulk = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !calendarId || !bulkFrom || !bulkTo || bulkDays.length === 0) return;
    setMsg(null);
    try {
      const res = await adminFetch<{ created: number }>('/admin/agenda/slots/bulk', token, {
        method: 'POST',
        body: JSON.stringify({
          calendarId,
          fromDate: bulkFrom,
          toDate: bulkTo,
          weekdays: bulkDays,
          startTime: bulkStart,
          endTime: bulkEnd,
        }),
      });
      setMsg(`${res.created} momenten toegevoegd.`);
      await loadSlots();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    }
  };

  const removeSlot = async (id: string) => {
    if (!token) return;
    setMsg(null);
    try {
      await adminFetch(`/admin/agenda/slots/${id}`, token, { method: 'DELETE' });
      setMsg('Moment verwijderd.');
      await loadSlots();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    }
  };

  const addClosed = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !calendarId || !closedDate) return;
    setMsg(null);
    try {
      await adminFetch('/admin/agenda/closed-days', token, {
        method: 'POST',
        body: JSON.stringify({ calendarId, closedDate, reason: closedReason || undefined }),
      });
      setClosedDate('');
      setClosedReason('');
      setMsg('Dag gemarkeerd als gesloten.');
      await loadClosed();
      await loadSlots();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    }
  };

  const removeClosed = async (id: string) => {
    if (!token) return;
    setMsg(null);
    try {
      await adminFetch(`/admin/agenda/closed-days/${id}`, token, { method: 'DELETE' });
      setMsg('Gesloten dag verwijderd.');
      await loadClosed();
      await loadSlots();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (loadErr) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{loadErr}</p>
        <Link href="/admin/agenda" className="text-sm text-burgundy underline">
          Terug naar overzicht
        </Link>
      </div>
    );
  }
  if (!cal) return <p className="text-sm text-muted">Laden…</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/admin/agenda" className="text-xs font-medium text-burgundy underline">
            ← Overzicht
          </Link>
          <h2 className="mt-1 text-lg font-semibold text-ink">{cal.title}</h2>
          <p className="text-xs text-muted">{cal.slug}</p>
        </div>
      </div>

      {msg ? <p className="text-xs text-ink">{msg}</p> : null}

      <form
        onSubmit={saveSettings}
        className="space-y-4 rounded-md border border-line bg-white p-4 shadow-sm"
      >
        <h3 className="text-sm font-semibold text-ink">Uren &amp; boekingen</h3>
        <p className="text-xs text-muted">
          <strong>Duur</strong> = lengte van één afspraak (slot). <strong>Stap</strong> = elke hoeveel minuten een
          nieuwe start (kleiner dan de duur = overlappende blokken). Leeg bij stap = zelfde als duur.
        </p>
        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            Titel
            <input className="rounded border border-line px-2 py-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Slug
            <input className="rounded border border-line px-2 py-1.5" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Afspraakduur (min)
            <input
              type="number"
              min={5}
              className="rounded border border-line px-2 py-1.5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Start elke … min (optioneel)
            <input
              type="number"
              min={5}
              placeholder="zelfde als duur"
              className="rounded border border-line px-2 py-1.5"
              value={slotStepMinutes}
              onChange={(e) => setSlotStepMinutes(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Capaciteit per slot
            <input
              type="number"
              min={1}
              className="rounded border border-line px-2 py-1.5"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Sorteervolgorde
            <input
              type="number"
              className="rounded border border-line px-2 py-1.5"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Kleur
            <input type="color" className="h-9 rounded border border-line" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Dag start (open dagen → auto-sloten)
            <input type="time" className="rounded border border-line px-2 py-1.5" value={dayStart} onChange={(e) => setDayStart(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Dag einde
            <input type="time" className="rounded border border-line px-2 py-1.5" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Pauze van
            <input type="time" className="rounded border border-line px-2 py-1.5" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Pauze tot
            <input type="time" className="rounded border border-line px-2 py-1.5" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Actief
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={publicBooking} onChange={(e) => setPublicBooking(e.target.checked)} />
          Publiek boekbaar
        </label>
        <label className="flex items-start gap-2 text-xs sm:col-span-2">
          <input type="checkbox" checked={restrictToOpenDays} onChange={(e) => setRestrictToOpenDays(e.target.checked)} />
          <span>
            Alleen <strong>open dagen</strong> (oranje hieronder) tonen aan gasten. Zonder open dagen zijn er geen
            boekbare momenten als dit aan staat.
          </span>
        </label>
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" checked={showEndTimeOnPublic} onChange={(e) => setShowEndTimeOnPublic(e.target.checked)} />
          <span>
            <strong>Einduur tonen</strong> in de publieke boekingskalender (uit voor casting e.d. — alleen startuur
            zichtbaar).
          </span>
        </label>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={restrictStarts}
              onChange={(e) => {
                const on = e.target.checked;
                setRestrictStarts(on);
                if (on) {
                  const dur = parseInt(durationMinutes, 10) || 60;
                  setSelectedStartsMin(new Set(halfHourStartsInWindow(dayStart, dayEnd, dur, breakStart, breakEnd)));
                }
              }}
            />
            <span>
              Alleen <strong>deze starturen</strong> gebruiken bij automatisch aanmaken van sloten op een open dag
              (anders: alle starts volgens stap tussen dag begin en einde).
            </span>
          </label>
          {restrictStarts ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {chipStarts.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleStartChip(m)}
                  className={[
                    'rounded px-2 py-1 text-[11px] font-medium',
                    selectedStartsMin.has(m) ? 'bg-burgundy text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-300',
                  ].join(' ')}
                >
                  {minToLabel(m)}
                </button>
              ))}
              {!chipStarts.length ? (
                <span className="text-[11px] text-muted">Pas dag start/einde en duur aan voor suggesties.</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <button type="submit" className="rounded-md bg-burgundy px-4 py-2 text-sm text-white hover:bg-burgundyDeep">
          Instellingen opslaan
        </button>
      </form>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-ink">Open dagen (voor deze agenda)</h3>
        <p className="mt-1 text-xs text-muted">
          Oranje = open voor boekingen (als “alleen open dagen” hierboven aan staat). Bij het markeren van een open dag
          worden ontbrekende sloten automatisch aangemaakt volgens uw uren hierboven.
        </p>
        {!restrictToOpenDays ? (
          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
            “Alleen open dagen” staat uit — gasten zien alle geplande sloten. Zet dit aan om per dag te sturen.
          </p>
        ) : null}
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={repeatNext} onChange={(e) => setRepeatNext(e.target.checked)} />
          Volgende klik(s) <strong>jaarlijks</strong> herhalen
        </label>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
          <button type="button" className="rounded border border-line px-2 py-0.5" onClick={() => setViewYear((y) => y - 1)}>
            ‹
          </button>
          <span className="font-medium text-ink">{viewYear}</span>
          <button type="button" className="rounded border border-line px-2 py-0.5" onClick={() => setViewYear((y) => y + 1)}>
            ›
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <div key={month} className="rounded-md border border-line bg-zinc-50/80 p-3">
              <p className="text-xs font-semibold capitalize text-ink">
                {new Intl.DateTimeFormat('nl-BE', { month: 'long' }).format(new Date(viewYear, month - 1, 1))}
              </p>
              <div className="mt-2 grid grid-cols-7 gap-0.5 text-[9px] text-muted">
                {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
                {monthGrid(viewYear, month).map((row, ri) => (
                  <div key={ri} className="contents">
                    {row.map((cell, ci) =>
                      cell ? (
                        <button
                          key={cell.ymd}
                          type="button"
                          onClick={() => toggleOpenDay(cell.ymd)}
                          title={byYmd.get(cell.ymd)?.repeatYearly ? 'Jaarlijks' : ''}
                          className={[
                            'aspect-square max-h-7 rounded text-[10px] font-medium leading-none',
                            byYmd.has(cell.ymd)
                              ? 'bg-amber-500 text-white ring-1 ring-amber-700 hover:bg-amber-600'
                              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
                          ].join(' ')}
                        >
                          {cell.d}
                        </button>
                      ) : (
                        <span key={`e-${ri}-${ci}`} className="max-h-7" />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-ink">Extra moment (handmatig)</h3>
        <form onSubmit={addSlot} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Datum
            <input type="date" className="rounded border border-line px-2 py-1.5" value={slotDate} required onChange={(e) => setSlotDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Van
            <input type="time" className="rounded border border-line px-2 py-1.5" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Tot
            <input type="time" className="rounded border border-line px-2 py-1.5" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
          <button type="submit" className="rounded-md bg-burgundy px-4 py-2 text-white hover:bg-burgundyDeep">
            Toevoegen
          </button>
        </form>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-ink">Bulk: vaste blok in periode</h3>
        <p className="mt-1 text-xs text-muted">Per matchinge weekdag één tijdblok (UTC-weekdag).</p>
        <form onSubmit={addBulk} className="mt-3 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {WEEK_OPTS.map((w) => (
              <label key={w.v} className="flex cursor-pointer items-center gap-1 rounded border border-line px-2 py-1 text-xs">
                <input type="checkbox" checked={bulkDays.includes(w.v)} onChange={() => toggleBulkDay(w.v)} />
                {w.label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              Van
              <input type="date" className="rounded border border-line px-2 py-1.5" value={bulkFrom} required onChange={(e) => setBulkFrom(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Tot
              <input type="date" className="rounded border border-line px-2 py-1.5" value={bulkTo} required onChange={(e) => setBulkTo(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Start
              <input type="time" className="rounded border border-line px-2 py-1.5" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Einde
              <input type="time" className="rounded border border-line px-2 py-1.5" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} />
            </label>
            <button type="submit" className="rounded-md bg-burgundy px-4 py-2 text-white hover:bg-burgundyDeep">
              Bulk toevoegen
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-ink">Gesloten dagen</h3>
        <form onSubmit={addClosed} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Datum
            <input type="date" className="rounded border border-line px-2 py-1.5" value={closedDate} required onChange={(e) => setClosedDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Reden
            <input className="rounded border border-line px-2 py-1.5" value={closedReason} onChange={(e) => setClosedReason(e.target.value)} />
          </label>
          <button type="submit" className="rounded-md border border-zinc-300 px-4 py-2 hover:bg-zinc-50">
            Dag sluiten
          </button>
        </form>
        <ul className="mt-3 divide-y divide-line text-xs">
          {closed.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {r.closedDate}
                {r.reason ? <span className="text-muted"> — {r.reason}</span> : null}
              </span>
              <button type="button" className="text-burgundy underline" onClick={() => removeClosed(r.id)}>
                Verwijderen
              </button>
            </li>
          ))}
          {!closed.length ? <li className="py-2 text-muted">Geen gesloten dagen.</li> : null}
        </ul>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-ink">Komende momenten (120 dagen)</h3>
        <ul className="mt-3 max-h-[380px] divide-y divide-line overflow-y-auto text-xs">
          {slots.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium text-ink">
                  {s.slotDate} {s.startTime}–{s.endTime}
                </span>
                <span className="ml-2 text-muted">
                  {s.booked}/{s.capacity} · {s.remaining} vrij
                </span>
              </span>
              <button
                type="button"
                className="text-burgundy underline disabled:opacity-40"
                disabled={s.booked > 0}
                onClick={() => removeSlot(s.id)}
              >
                Verwijderen
              </button>
            </li>
          ))}
          {!slots.length ? <li className="py-4 text-muted">Geen momenten.</li> : null}
        </ul>
      </section>
    </div>
  );
}
