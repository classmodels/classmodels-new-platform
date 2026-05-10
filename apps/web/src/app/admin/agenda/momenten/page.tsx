'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Cal = { id: string; slug: string; title: string };

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

const WEEK_OPTS = [
  { v: 1, label: 'Ma' },
  { v: 2, label: 'Di' },
  { v: 3, label: 'Wo' },
  { v: 4, label: 'Do' },
  { v: 5, label: 'Vr' },
  { v: 6, label: 'Za' },
  { v: 0, label: 'Zo' },
];

export default function AdminAgendaMomentenPage() {
  const { token } = useAuth();
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [calendarId, setCalendarId] = useState('');
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [closed, setClosed] = useState<ClosedRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

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

  const loadCals = useCallback(async () => {
    if (!token) return;
    const rows = await adminFetch<Cal[]>('/admin/agenda/calendars', token);
    setCalendars(rows);
    setCalendarId((prev) => prev || rows[0]?.id || '');
  }, [token]);

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
    loadCals().catch(() => {});
  }, [loadCals]);

  useEffect(() => {
    loadSlots().catch(() => setSlots([]));
    loadClosed().catch(() => setClosed([]));
  }, [loadSlots, loadClosed]);

  const calOptions = useMemo(
    () => calendars.map((c) => ({ id: c.id, label: `${c.title} (${c.slug})` })),
    [calendars],
  );

  const toggleBulkDay = (v: number) => {
    setBulkDays((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort()));
  };

  const addSlot = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!token || !calendarId || !slotDate) return;
    try {
      await adminFetch('/admin/agenda/slots', token, {
        method: 'POST',
        body: JSON.stringify({
          calendarId,
          slotDate,
          startTime,
          endTime,
        }),
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
    setMsg(null);
    if (!token || !calendarId || !bulkFrom || !bulkTo || bulkDays.length === 0) return;
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
      setMsg(`${res.created} momenten toegevoegd (dubbele combinaties overgeslagen).`);
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
    setMsg(null);
    if (!token || !calendarId || !closedDate) return;
    try {
      await adminFetch('/admin/agenda/closed-days', token, {
        method: 'POST',
        body: JSON.stringify({
          calendarId,
          closedDate,
          reason: closedReason || undefined,
        }),
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

  return (
    <div className="space-y-8">
      {msg ? <p className="text-xs text-ink">{msg}</p> : null}

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <label className="text-sm font-semibold text-ink">
          Agenda
          <select
            className="mt-1 block w-full max-w-md rounded border border-line bg-white px-2 py-1.5 text-sm"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
          >
            {calOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Enkel moment</h2>
        <form onSubmit={addSlot} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Datum
            <input
              type="date"
              className="rounded border border-line px-2 py-1.5"
              value={slotDate}
              required
              onChange={(e) => setSlotDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Van
            <input
              type="time"
              className="rounded border border-line px-2 py-1.5"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Tot
            <input
              type="time"
              className="rounded border border-line px-2 py-1.5"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
          <button type="submit" className="rounded-md bg-burgundy px-4 py-2 text-white hover:bg-burgundyDeep">
            Toevoegen
          </button>
        </form>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Bulk: vaste dag(en) in periode</h2>
        <p className="mt-1 text-xs text-muted">
          Kies weekdagen (UTC) en een datumbereik; er wordt per matchinge dag één blok van–tot aangemaakt.
        </p>
        <form onSubmit={addBulk} className="mt-3 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {WEEK_OPTS.map((w) => (
              <label key={w.v} className="flex cursor-pointer items-center gap-1 rounded border border-line px-2 py-1">
                <input
                  type="checkbox"
                  checked={bulkDays.includes(w.v)}
                  onChange={() => toggleBulkDay(w.v)}
                />
                {w.label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              Van datum
              <input
                type="date"
                className="rounded border border-line px-2 py-1.5"
                value={bulkFrom}
                required
                onChange={(e) => setBulkFrom(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Tot datum
              <input
                type="date"
                className="rounded border border-line px-2 py-1.5"
                value={bulkTo}
                required
                onChange={(e) => setBulkTo(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Starttijd
              <input
                type="time"
                className="rounded border border-line px-2 py-1.5"
                value={bulkStart}
                onChange={(e) => setBulkStart(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Eindtijd
              <input
                type="time"
                className="rounded border border-line px-2 py-1.5"
                value={bulkEnd}
                onChange={(e) => setBulkEnd(e.target.value)}
              />
            </label>
            <button type="submit" className="rounded-md bg-burgundy px-4 py-2 text-white hover:bg-burgundyDeep">
              Bulk toevoegen
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Gesloten dagen</h2>
        <form onSubmit={addClosed} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Datum
            <input
              type="date"
              className="rounded border border-line px-2 py-1.5"
              value={closedDate}
              required
              onChange={(e) => setClosedDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Reden (optioneel)
            <input
              className="rounded border border-line px-2 py-1.5"
              value={closedReason}
              onChange={(e) => setClosedReason(e.target.value)}
            />
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
        <h2 className="text-sm font-semibold text-ink">Komende momenten (120 dagen)</h2>
        <ul className="mt-3 max-h-[420px] divide-y divide-line overflow-y-auto text-xs">
          {slots.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium text-ink">
                  {s.slotDate} {s.startTime}–{s.endTime}
                </span>
                <span className="ml-2 text-muted">
                  {s.booked}/{s.capacity} bezet · {s.remaining} vrij
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
          {!slots.length ? <li className="py-4 text-muted">Geen momenten in dit venster.</li> : null}
        </ul>
      </section>
    </div>
  );
}
