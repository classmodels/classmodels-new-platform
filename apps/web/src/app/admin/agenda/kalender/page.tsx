'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Cal = { id: string; slug: string; title: string };

type DayCell = {
  bookings: Array<{ id: string; startAt: string; name: string | null; email: string | null; status: string }>;
  openSlots: Array<{ id: string; startTime: string; endTime: string }>;
};

export default function AdminAgendaKalenderPage() {
  const { token } = useAuth();
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [calendarId, setCalendarId] = useState('');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<Record<string, DayCell>>({});

  const loadCals = useCallback(async () => {
    if (!token) return;
    const rows = await adminFetch<Cal[]>('/admin/agenda/calendars', token);
    setCalendars(rows);
    setCalendarId((prev) => prev || rows[0]?.id || '');
  }, [token]);

  const loadMonth = useCallback(async () => {
    if (!token || !calendarId) return;
    const data = await adminFetch<{
      year: number;
      month: number;
      days: Record<string, DayCell>;
    }>(
      `/admin/agenda/calendar-month?calendarId=${encodeURIComponent(calendarId)}&year=${year}&month=${month}`,
      token,
    );
    setDays(data.days);
  }, [token, calendarId, year, month]);

  useEffect(() => {
    loadCals().catch(() => {});
  }, [loadCals]);

  useEffect(() => {
    loadMonth().catch(() => setDays({}));
  }, [loadMonth]);

  const grid = useMemo(() => {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const last = new Date(Date.UTC(year, month, 0));
    const startPad = first.getUTCDay() === 0 ? 6 : first.getUTCDay() - 1;
    const totalDays = last.getUTCDate();
    const cells: Array<{ key: string; dayNum: number | null }> = [];
    for (let i = 0; i < startPad; i++) cells.push({ key: `pad-${i}`, dayNum: null });
    for (let d = 1; d <= totalDays; d++) {
      const ymd = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ key: ymd, dayNum: d });
    }
    return cells;
  }, [year, month]);

  const monthLabel = new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end gap-4 rounded-md border border-line bg-white p-4 shadow-sm text-sm">
        <label className="flex flex-col gap-1">
          Agenda
          <select
            className="min-w-[240px] rounded border border-line bg-white px-2 py-1.5"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
          >
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.slug})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Maand
          <input
            type="month"
            className="rounded border border-line px-2 py-1.5"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const [y, m] = v.split('-').map((x) => parseInt(x, 10));
              setYear(y);
              setMonth(m);
            }}
          />
        </label>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold capitalize text-ink">{monthLabel}</h2>
        <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] sm:text-xs">
          {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d) => (
            <div key={d} className="border-b border-line py-1 font-semibold text-muted">
              {d}
            </div>
          ))}
          {grid.map((cell) => {
            if (cell.dayNum === null) {
              return <div key={cell.key} className="min-h-[72px] rounded bg-zinc-50 sm:min-h-[96px]" />;
            }
            const ymd = cell.key;
            const cellData = days[ymd];
            const bCount = cellData?.bookings?.length ?? 0;
            const sCount = cellData?.openSlots?.length ?? 0;
            return (
              <div
                key={cell.key}
                className="min-h-[72px] rounded border border-line bg-white p-1 sm:min-h-[96px] sm:p-1.5"
              >
                <div className="font-semibold text-ink">{cell.dayNum}</div>
                {bCount ? (
                  <div className="mt-0.5 text-[10px] text-burgundy">{bCount} afspr.</div>
                ) : null}
                {sCount ? (
                  <div className="text-[10px] text-emerald-700">{sCount} vrij</div>
                ) : null}
                {!bCount && !sCount ? <div className="text-[10px] text-zinc-300">—</div> : null}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Rode aantallen = bevestigde boekingen; groen = nog vrije sloten die dag. Klik op{' '}
          <strong>Boekingen</strong> of <strong>Momenten</strong> voor details.
        </p>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-ink">Detail per dag (deze maand)</h3>
        <ul className="mt-3 max-h-[360px] space-y-3 overflow-y-auto text-xs">
          {Object.keys(days)
            .sort()
            .filter((ymd) => {
              const d = days[ymd];
              return d.bookings.length > 0 || d.openSlots.length > 0;
            })
            .map((ymd) => {
              const d = days[ymd];
              return (
                <li key={ymd} className="rounded border border-line/80 bg-zinc-50/80 p-2">
                  <p className="font-medium text-ink">{ymd}</p>
                  {d.bookings.length ? (
                    <ul className="mt-1 space-y-0.5 text-muted">
                      {d.bookings.map((b) => (
                        <li key={b.id}>
                          {new Date(b.startAt).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}{' '}
                          — {b.name || b.email || '—'} ({b.status})
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {d.openSlots.length ? (
                    <p className="mt-1 text-emerald-800">
                      Vrij: {d.openSlots.map((s) => `${s.startTime}–${s.endTime}`).join(', ')}
                    </p>
                  ) : null}
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}
