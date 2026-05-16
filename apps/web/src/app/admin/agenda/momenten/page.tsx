'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

export default function AdminAgendaMomentenPage() {
  const { token } = useAuth();
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [calendarId, setCalendarId] = useState('');
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

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

  useEffect(() => {
    loadCals().catch(() => {});
  }, [loadCals]);

  useEffect(() => {
    loadSlots().catch(() => setSlots([]));
  }, [loadSlots]);

  const calOptions = useMemo(
    () => calendars.map((c) => ({ id: c.id, label: `${c.title} (${c.slug})` })),
    [calendars],
  );

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

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-8">
      {msg ? <p className="text-xs text-ink">{msg}</p> : null}

      <section className="rounded-md border border-line bg-zinc-50 p-4 text-xs text-muted shadow-sm">
        <p>
          Nieuwe momenten komen <strong className="text-ink">alleen</strong> van <strong className="text-ink">Open dagen</strong> plus de
          standaarduren op de pagina <Link href="/admin/agenda" className="text-burgundy underline">Uren &amp; dagen</Link> per agenda. Hier
          alleen overzicht en verwijderen (bv. oude testdata).
        </p>
      </section>

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
