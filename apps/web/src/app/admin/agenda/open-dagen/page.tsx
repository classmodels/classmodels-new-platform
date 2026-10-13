'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { isLegacyGuestAgendaSlug } from '@/lib/model-worden-agenda';

type Cal = {
  id: string;
  slug: string;
  title: string;
  color: string;
  active?: boolean;
  restrictToOpenDays?: boolean;
  showOccupiedHoursTestshoot?: boolean;
  showOccupiedHoursIntake?: boolean;
  showOccupiedHours?: boolean;
};
type OpenRow = {
  id: string;
  openDate: string;
  repeatYearly: boolean;
  fullyBooked?: boolean;
  fullyBookedTestshoot?: boolean;
  fullyBookedIntake?: boolean;
};

function packageFull(row: OpenRow | undefined, kind: 'testshoot' | 'intake'): boolean {
  if (!row) return false;
  if (kind === 'testshoot') return Boolean(row.fullyBookedTestshoot || row.fullyBooked);
  return Boolean(row.fullyBookedIntake || row.fullyBooked);
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

export default function AdminAgendaOpenDagenPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [calendarId, setCalendarId] = useState('');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [openRows, setOpenRows] = useState<OpenRow[]>([]);
  const [repeatNext, setRepeatNext] = useState(false);
  const [applyTestshoot, setApplyTestshoot] = useState(true);
  const [applyIntake, setApplyIntake] = useState(true);
  const [showOccupiedTestshoot, setShowOccupiedTestshoot] = useState(false);
  const [showOccupiedIntake, setShowOccupiedIntake] = useState(false);
  const [showOccupiedHours, setShowOccupiedHours] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedYmds, setSelectedYmds] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const loadCals = useCallback(async () => {
    if (!token) return;
    const list = await adminFetch<Cal[]>('/admin/agenda/calendars', token);
    const active = list.filter(
      (c) => c.active !== false && !isLegacyGuestAgendaSlug(c.slug),
    );
    setCalendars(active);
    setCalendarId((prev) =>
      prev && active.some((c) => c.id === prev) ? prev : active[0]?.id || '',
    );
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
    setSelectedYmds(new Set());
  }, [loadOpen]);

  const byYmd = useMemo(() => {
    const m = new Map<string, OpenRow>();
    for (const r of openRows) m.set(r.openDate, r);
    return m;
  }, [openRows]);

  const selectedCal = calendars.find((c) => c.id === calendarId);
  const isModelWorden = selectedCal?.slug === 'model-worden';

  useEffect(() => {
    setShowOccupiedTestshoot(Boolean(selectedCal?.showOccupiedHoursTestshoot));
    setShowOccupiedIntake(Boolean(selectedCal?.showOccupiedHoursIntake));
    setShowOccupiedHours(Boolean(selectedCal?.showOccupiedHours));
  }, [
    selectedCal?.id,
    selectedCal?.showOccupiedHoursTestshoot,
    selectedCal?.showOccupiedHoursIntake,
    selectedCal?.showOccupiedHours,
  ]);

  const selectedList = useMemo(() => [...selectedYmds].sort(), [selectedYmds]);
  const selectedExistingCount = selectedList.filter((ymd) => byYmd.has(ymd)).length;
  const canOpen = selectedList.some((ymd) => {
    const row = byYmd.get(ymd);
    if (!row) return true;
    if (!isModelWorden) return Boolean(row.fullyBooked);
    return (applyTestshoot && packageFull(row, 'testshoot')) || (applyIntake && packageFull(row, 'intake'));
  });
  const canMarkFull =
    (!isModelWorden || applyTestshoot || applyIntake) &&
    selectedList.some((ymd) => {
      const row = byYmd.get(ymd);
      if (!isModelWorden) return !row?.fullyBooked;
      if (!row) return true;
      return (applyTestshoot && !packageFull(row, 'testshoot')) || (applyIntake && !packageFull(row, 'intake'));
    });

  const toggleSelectDay = (ymd: string) => {
    setSelectedYmds((prev) => {
      const n = new Set(prev);
      if (n.has(ymd)) n.delete(ymd);
      else n.add(ymd);
      return n;
    });
  };

  const clearSelection = () => setSelectedYmds(new Set());

  const openSelected = async () => {
    if (!token || !calendarId || !canOpen) return;
    setBusy(true);
    setMsg(null);
    try {
      const toOpen = selectedList.filter((ymd) => {
        const row = byYmd.get(ymd);
        if (!row) return true;
        if (!isModelWorden) return Boolean(row.fullyBooked);
        const reopenTestshoot = applyTestshoot && packageFull(row, 'testshoot');
        const reopenIntake = applyIntake && packageFull(row, 'intake');
        return reopenTestshoot || reopenIntake;
      });
      for (const ymd of toOpen) {
        const row = byYmd.get(ymd);
        const body = isModelWorden
          ? {
              fullyBookedTestshoot: applyTestshoot ? false : packageFull(row, 'testshoot'),
              fullyBookedIntake: applyIntake ? false : packageFull(row, 'intake'),
            }
          : { fullyBooked: false };
        await adminFetch('/admin/agenda/open-days', token, {
          method: 'POST',
          body: JSON.stringify({
            calendarId,
            openDate: ymd,
            repeatYearly: row?.repeatYearly ?? repeatNext,
            ...body,
          }),
        });
      }
      setMsg(
        toOpen.length === 1
          ? '1 dag open gezet.'
          : `${toOpen.length} dagen open gezet.`,
      );
      clearSelection();
      await loadOpen();
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    } finally {
      setBusy(false);
    }
  };

  const markFullSelected = async () => {
    if (!token || !calendarId) return;
    if (isModelWorden && !applyTestshoot && !applyIntake) return;
    const toFull = selectedList.filter((ymd) => {
      const row = byYmd.get(ymd);
      if (!isModelWorden) return !row?.fullyBooked;
      const markTestshoot = applyTestshoot && !packageFull(row, 'testshoot');
      const markIntake = applyIntake && !packageFull(row, 'intake');
      return markTestshoot || markIntake || !row;
    });
    if (toFull.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      for (const ymd of toFull) {
        const row = byYmd.get(ymd);
        const body = isModelWorden
          ? {
              fullyBookedTestshoot: applyTestshoot ? true : packageFull(row, 'testshoot'),
              fullyBookedIntake: applyIntake ? true : packageFull(row, 'intake'),
            }
          : { fullyBooked: true };
        await adminFetch('/admin/agenda/open-days', token, {
          method: 'POST',
          body: JSON.stringify({
            calendarId,
            openDate: ymd,
            repeatYearly: row?.repeatYearly ?? repeatNext,
            ...body,
          }),
        });
      }
      setMsg(
        toFull.length === 1
          ? '1 dag volgeboekt gezet.'
          : `${toFull.length} dagen volgeboekt gezet.`,
      );
      clearSelection();
      await loadOpen();
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    } finally {
      setBusy(false);
    }
  };

  const closeSelected = async () => {
    const existing = selectedExistingCount;
    if (!token || !calendarId || existing === 0) return;
    const ok = window.confirm(
      `${existing} dag(en) uitzetten?\n\n` +
        'Bestaande afspraken blijven staan in de planning.\n' +
        'Alleen nieuwe online boekingen voor die dagen worden gestopt.',
    );
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const toClose = selectedList
        .map((ymd) => byYmd.get(ymd))
        .filter((r): r is OpenRow => Boolean(r));
      for (const row of toClose) {
        await adminFetch(`/admin/agenda/open-days/${row.id}`, token, { method: 'DELETE' });
      }
      setMsg(
        toClose.length === 1
          ? '1 dag uitgezet als open dag (afspraken behouden).'
          : `${toClose.length} dagen uitgezet als open dag (afspraken behouden).`,
      );
      clearSelection();
      await loadOpen();
      router.refresh();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    } finally {
      setBusy(false);
    }
  };

  const saveOccupied = async (next: { testshoot?: boolean; intake?: boolean }) => {
    if (!token || !calendarId || !isModelWorden) return;
    const showOccupiedHoursTestshoot = next.testshoot ?? showOccupiedTestshoot;
    const showOccupiedHoursIntake = next.intake ?? showOccupiedIntake;
    setShowOccupiedTestshoot(showOccupiedHoursTestshoot);
    setShowOccupiedIntake(showOccupiedHoursIntake);
    setMsg(null);
    try {
      await adminFetch(`/admin/agenda/calendars/${calendarId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ showOccupiedHoursTestshoot, showOccupiedHoursIntake }),
      });
      setMsg('Instelling voor bezette uren opgeslagen.');
      await loadCals();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Opslaan mislukt');
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6 print:hidden">
      {msg ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
          {msg}
        </p>
      ) : null}

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Open dagen per agenda</h2>
        <p className="mt-1 text-xs text-muted">
          Duid meerdere dagen aan. Oranje = open. Rood = volzet. Dit geldt
          wanneer de agenda op <strong>alleen open dagen</strong> staat — de standaard; zie anders de melding
          hieronder.
          <br />
          <span className="text-amber-900">
            Tip: een dag uitzetten stopt alleen nieuwe boekingen — bestaande afspraken verdwijnen niet.
          </span>
        </p>
        {selectedCal?.restrictToOpenDays === false ? (
          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
            Deze agenda staat op automatische weekdagen i.p.v. alleen open dagen. Schakel &quot;alleen open dagen&quot;
            in bij de agenda-instellingen (menu Agenda&apos;s → bewerken of uren-pagina).
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
          Open zetten met <strong>jaarlijks</strong> herhalen (zelfde kalenderdag elk jaar)
        </label>
        <label className="mt-2 flex items-center gap-2 text-xs text-ink">
          <input
            type="checkbox"
            checked={showOccupiedHours}
            onChange={(e) => {
              const on = e.target.checked;
              setShowOccupiedHours(on);
              if (!token || !calendarId) return;
              void adminFetch(`/admin/agenda/calendars/${calendarId}`, token, {
                method: 'PATCH',
                body: JSON.stringify({ showOccupiedHours: on }),
              })
                .then(() => {
                  setMsg(on ? 'Bezette uren worden rood getoond met «bezet».' : 'Bezette uren worden verborgen.');
                  return loadCals();
                })
                .catch((err: unknown) => setMsg(err instanceof Error ? err.message : 'Opslaan mislukt'));
            }}
          />
          Bezette uren in het rood met «bezet»
        </label>

        {isModelWorden ? (
          <div className="mt-3 space-y-2 rounded-md border border-line bg-zinc-50 px-3 py-2">
            <p className="text-xs font-medium text-ink">Volgeboekt geldt voor</p>
            <p className="text-[11px] text-muted">
              Vink één of beide aan. Alleen die afspraak wordt volgeboekt. De andere blijft gewoon open.
            </p>
            <label className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                checked={applyTestshoot}
                onChange={(e) => setApplyTestshoot(e.target.checked)}
              />
              Gratis fotoshoot + intakegesprek
            </label>
            <label className="flex items-center gap-2 text-xs text-ink">
              <input type="checkbox" checked={applyIntake} onChange={(e) => setApplyIntake(e.target.checked)} />
              Intake-gesprek
            </label>
            <p className="pt-1 text-xs font-medium text-ink">Bezette uren</p>
            <p className="text-[11px] text-muted">
              Aangevinkt: een bezet uur blijft staan, in het rood, met «bezet». Uitgevinkt: dat uur verdwijnt.
            </p>
            <label className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                checked={showOccupiedTestshoot}
                onChange={(e) => void saveOccupied({ testshoot: e.target.checked })}
              />
              Gratis fotoshoot + intakegesprek: bezette uren rood met bezet
            </label>
            <label className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                checked={showOccupiedIntake}
                onChange={(e) => void saveOccupied({ intake: e.target.checked })}
              />
              Intake-gesprek: bezette uren rood met bezet
            </label>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || !canOpen}
            onClick={() => void openSelected()}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            Open zetten
          </button>
          <button
            type="button"
            disabled={busy || !canMarkFull}
            onClick={() => void markFullSelected()}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40"
          >
            Volzet zetten
          </button>
          <button
            type="button"
            disabled={busy || selectedExistingCount === 0}
            onClick={() => void closeSelected()}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-zinc-100 disabled:opacity-40"
          >
            Uitzetten{selectedExistingCount ? ` (${selectedExistingCount})` : ''}
          </button>
          <button
            type="button"
            disabled={busy || selectedList.length === 0}
            onClick={clearSelection}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-muted hover:bg-zinc-50 disabled:opacity-40"
          >
            Selectie wissen
          </button>
          {selectedList.length > 0 ? (
            <span className="text-[11px] text-muted">{selectedList.length} dag(en) geselecteerd</span>
          ) : (
            <span className="text-[11px] text-muted">Klik dagen om te selecteren</span>
          )}
        </div>

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
        {openRows.some((r) => r.fullyBooked || r.fullyBookedTestshoot || r.fullyBookedIntake) ? (
          <p className="mt-3 text-xs font-semibold text-red-800">
            Volzet:{' '}
            {openRows
              .filter((r) => r.fullyBooked || r.fullyBookedTestshoot || r.fullyBookedIntake)
              .map((r) => r.openDate.split('-').reverse().join('/'))
              .join(', ')}
          </p>
        ) : null}
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
                        disabled={busy}
                        onClick={() => toggleSelectDay(cell.ymd)}
                        title={(() => {
                          const openRow = byYmd.get(cell.ymd);
                          const testshoot = packageFull(openRow, 'testshoot');
                          const intake = packageFull(openRow, 'intake');
                          const label = !openRow
                            ? 'Gesloten'
                            : isModelWorden && testshoot && intake
                              ? 'Volgeboekt voor beide'
                              : isModelWorden && testshoot
                                ? 'Volgeboekt: gratis fotoshoot + intake'
                                : isModelWorden && intake
                                  ? 'Volgeboekt: intake-gesprek'
                                  : openRow.fullyBooked
                                    ? 'Volgeboekt'
                                    : openRow.repeatYearly
                                      ? 'Jaarlijks open'
                                      : 'Open';
                          return [label, selectedYmds.has(cell.ymd) ? 'geselecteerd' : ''].filter(Boolean).join(' · ');
                        })()}
                        className={[
                          'aspect-square max-h-7 rounded text-[10px] font-medium leading-none',
                          (() => {
                            const openRow = byYmd.get(cell.ymd);
                            if (!openRow) return 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200';
                            const testshoot = packageFull(openRow, 'testshoot');
                            const intake = packageFull(openRow, 'intake');
                            const both = isModelWorden ? testshoot && intake : Boolean(openRow.fullyBooked);
                            const partial = isModelWorden && testshoot !== intake;
                            if (both) return 'bg-red-600 text-white ring-1 ring-red-800 hover:bg-red-700';
                            if (partial) return 'bg-red-400 text-white ring-1 ring-red-700 hover:bg-red-500';
                            return 'bg-amber-500 text-white ring-1 ring-amber-700 hover:bg-amber-600';
                          })(),
                          selectedYmds.has(cell.ymd)
                            ? 'outline outline-2 outline-offset-1 outline-zinc-900'
                            : '',
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
