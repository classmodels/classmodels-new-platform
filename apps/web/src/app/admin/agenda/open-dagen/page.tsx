'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Cal = { id: string; slug: string; title: string; color: string; restrictToOpenDays?: boolean };
type OpenRow = { id: string; openDate: string; repeatYearly: boolean };

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

export default function AdminAgendaOpenDagenPage() {
  const { token } = useAuth();
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [calendarId, setCalendarId] = useState('');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [openRows, setOpenRows] = useState<OpenRow[]>([]);
  const [repeatNext, setRepeatNext] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadCals = useCallback(async () => {
    if (!token) return;
    const list = await adminFetch<Cal[]>('/admin/agenda/calendars', token);
    setCalendars(list);
    setCalendarId((prev) => prev || list[0]?.id || '');
  }, [token]);

  const loadOpen = useCallback(async () => {
    if (!token || !calendarId) return;
    const rows = await adminFetch<OpenRow[]>(
      `/admin/agenda/open-days?calendarId=${encodeURIComponent(calendarId)}`,
      token,
    );
    setOpenRows(rows);
  }, [token, calendarId]);

  useEffect(() => {
    loadCals().catch(() => {});
  }, [loadCals]);

  useEffect(() => {
    loadOpen().catch(() => setOpenRows([]));
  }, [loadOpen]);

  const byYmd = useMemo(() => {
    const m = new Map<string, OpenRow>();
    for (const r of openRows) m.set(r.openDate, r);
    return m;
  }, [openRows]);

  const selectedCal = calendars.find((c) => c.id === calendarId);

  const toggleDay = async (ymd: string) => {
    if (!token || !calendarId) return;
    setMsg(null);
    const existing = byYmd.get(ymd);
    try {
      if (existing) {
        await adminFetch(`/admin/agenda/open-days/${existing.id}`, token, { method: 'DELETE' });
        setMsg('Dag verwijderd als open dag.');
      } else {
        await adminFetch('/admin/agenda/open-days', token, {
          method: 'POST',
          body: JSON.stringify({ calendarId, openDate: ymd, repeatYearly: repeatNext }),
        });
        setMsg(repeatNext ? 'Open gezet (jaarlijks).' : 'Open gezet.');
      }
      await loadOpen();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6 print:hidden">
      {msg ? <p className="text-xs text-ink">{msg}</p> : null}

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Open dagen per agenda</h2>
        <p className="mt-1 text-xs text-muted">
          Wit = niet als &quot;geopend&quot; gemarkeerd. <span className="font-medium text-amber-800">Oranje</span> =
          dag staat open voor online boekingen (enkel van toepassing als u bij de agenda{' '}
          <strong>alleen open dagen</strong> hebt aangevinkt).
        </p>
        {selectedCal?.restrictToOpenDays === false ? (
          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
            Deze agenda staat nog op &quot;alle dagen met sloten&quot;. Vink &quot;alleen open dagen&quot; aan bij{' '}
            <strong>Agenda&apos;s</strong> om dit te laten gelden.
          </p>
        ) : null}
        <label className="mt-3 block text-sm">
          Agenda
          <select
            className="mt-1 block max-w-md rounded border border-line bg-white px-2 py-1.5 text-sm"
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
        <label className="mt-3 flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" checked={repeatNext} onChange={(e) => setRepeatNext(e.target.checked)} />
          Volgende aangeklikte dag(en) <strong>jaarlijks</strong> herhalen (zelfde kalenderdag elk jaar)
        </label>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted">Jaar</span>
          <button
            type="button"
            className="rounded border border-line px-2 py-0.5 text-xs"
            onClick={() => setViewYear((y) => y - 1)}
          >
            ‹
          </button>
          <span className="text-sm font-medium">{viewYear}</span>
          <button
            type="button"
            className="rounded border border-line px-2 py-0.5 text-xs"
            onClick={() => setViewYear((y) => y + 1)}
          >
            ›
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <div key={month} className="rounded-md border border-line bg-white p-3 shadow-sm">
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
                        onClick={() => toggleDay(cell.ymd)}
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
    </div>
  );
}
