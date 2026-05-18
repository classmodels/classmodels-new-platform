'use client';

import { useParams, useRouter } from 'next/navigation';
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
  weekdayOpenMask?: number;
  planningTextOnColor?: string | null;
};

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

const WEEKDAY_TOGGLE: { dow: number; label: string }[] = [
  { dow: 1, label: 'Ma' },
  { dow: 2, label: 'Di' },
  { dow: 3, label: 'Wo' },
  { dow: 4, label: 'Do' },
  { dow: 5, label: 'Vr' },
  { dow: 6, label: 'Za' },
  { dow: 0, label: 'Zo' },
];

export default function AdminAgendaCalendarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const calendarId = typeof params.calendarId === 'string' ? params.calendarId : '';
  const { token } = useAuth();

  const [cal, setCal] = useState<Cal | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [active, setActive] = useState(true);
  const [publicBooking, setPublicBooking] = useState(true);
  const [restrictOnlyOpen, setRestrictOnlyOpen] = useState(true);
  const [weekdayMask, setWeekdayMask] = useState(0);
  const [showEndTimeOnPublic, setShowEndTimeOnPublic] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [slotStepMinutes, setSlotStepMinutes] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [sortOrder, setSortOrder] = useState('100');
  const [color, setColor] = useState('#6f121b');
  const [planningTextOnColor, setPlanningTextOnColor] = useState<'white' | 'black'>('white');
  const [dayStart, setDayStart] = useState('08:00');
  const [dayEnd, setDayEnd] = useState('18:00');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const [restrictStarts, setRestrictStarts] = useState(false);
  const [selectedStartsMin, setSelectedStartsMin] = useState<Set<number>>(() => new Set());

  const settingsFormId = 'agenda-cal-settings-form';

  const chipStarts = useMemo(() => {
    const dur = parseInt(durationMinutes, 10) || 60;
    return halfHourStartsInWindow(dayStart, dayEnd, dur, breakStart, breakEnd);
  }, [dayStart, dayEnd, durationMinutes, breakStart, breakEnd]);

  const applyCalToForm = useCallback((c: Cal) => {
    setTitle(c.title);
    setSlug(c.slug);
    setActive(c.active);
    setPublicBooking(c.publicBooking);
    setRestrictOnlyOpen(c.restrictToOpenDays !== false);
    setWeekdayMask(typeof c.weekdayOpenMask === 'number' ? c.weekdayOpenMask : 0);
    setShowEndTimeOnPublic(c.showEndTimeOnPublic !== false);
    setDurationMinutes(String(c.durationMinutes));
    setSlotStepMinutes(c.slotStepMinutes != null ? String(c.slotStepMinutes) : '');
    setCapacity(String(c.capacity));
    setSortOrder(String(c.sortOrder));
    setColor(c.color);
    setPlanningTextOnColor(c.planningTextOnColor === 'black' ? 'black' : 'white');
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

  useEffect(() => {
    loadCal().catch(() => {});
  }, [loadCal]);

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
          restrictToOpenDays: restrictOnlyOpen,
          weekdayOpenMask: restrictOnlyOpen ? 0 : weekdayMask,
          showEndTimeOnPublic,
          durationMinutes: dur,
          slotStepMinutes: stepParsed,
          optionalSlotStarts: optionalStarts,
          capacity: cap,
          sortOrder: sort,
          color,
          planningTextOnColor,
          defaultDayStartTime: dayStart || undefined,
          defaultDayEndTime: dayEnd || undefined,
          breakStart: breakStart.trim() ? breakStart : null,
          breakEnd: breakEnd.trim() ? breakEnd : null,
        }),
      });
      setMsg('Instellingen opgeslagen.');
      await loadCal();
      router.refresh();
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

  const toggleWeekday = (dow: number) => {
    setWeekdayMask((m) => m ^ (1 << dow));
  };

  const isDirty = useMemo(() => {
    if (!cal) return false;
    const savedOpen = cal.restrictToOpenDays !== false;
    const savedMask = typeof cal.weekdayOpenMask === 'number' ? cal.weekdayOpenMask : 0;
    const savedOptional = cal.optionalSlotStarts?.trim() ?? '';
    const nextOptional =
      restrictStarts ?
        [...selectedStartsMin]
            .sort((a, b) => a - b)
            .map(minToLabel)
            .join('\n')
      : '';
    return (
      title !== cal.title ||
      slug !== cal.slug ||
      active !== cal.active ||
      publicBooking !== cal.publicBooking ||
      restrictOnlyOpen !== savedOpen ||
      weekdayMask !== savedMask ||
      showEndTimeOnPublic !== (cal.showEndTimeOnPublic !== false) ||
      durationMinutes !== String(cal.durationMinutes) ||
      slotStepMinutes !== (cal.slotStepMinutes != null ? String(cal.slotStepMinutes) : '') ||
      capacity !== String(cal.capacity) ||
      sortOrder !== String(cal.sortOrder) ||
      color !== cal.color ||
      planningTextOnColor !== (cal.planningTextOnColor === 'black' ? 'black' : 'white') ||
      dayStart !== (toTimeInput(cal.defaultDayStartTime) || '08:00') ||
      dayEnd !== (toTimeInput(cal.defaultDayEndTime) || '18:00') ||
      breakStart !== toTimeInput(cal.breakStart) ||
      breakEnd !== toTimeInput(cal.breakEnd) ||
      restrictStarts !== !!savedOptional ||
      (restrictStarts && nextOptional !== savedOptional)
    );
  }, [
    cal,
    title,
    slug,
    active,
    publicBooking,
    restrictOnlyOpen,
    weekdayMask,
    showEndTimeOnPublic,
    durationMinutes,
    slotStepMinutes,
    capacity,
    sortOrder,
    color,
    planningTextOnColor,
    dayStart,
    dayEnd,
    breakStart,
    breakEnd,
    restrictStarts,
    selectedStartsMin,
  ]);

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (loadErr) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{loadErr}</p>
        <button
          type="button"
          className="rounded border border-line bg-panel px-3 py-1.5 text-sm text-ink"
          onClick={() => router.push('/admin/agenda')}
        >
          Terug
        </button>
      </div>
    );
  }
  if (!cal) return <p className="text-sm text-muted">Laden…</p>;

  return (
    <div className={`relative space-y-8 ${isDirty ? 'pb-24' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">{cal.title}</h2>
          <p className="text-xs text-muted">{cal.slug}</p>
        </div>
      </div>

      {msg ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
          {msg}
        </p>
      ) : null}

      <form
        id={settingsFormId}
        onSubmit={saveSettings}
        className="mx-auto max-w-2xl space-y-4 rounded-md border border-line bg-white p-4 shadow-sm"
      >
        <h3 className="text-sm font-semibold text-ink">Uren &amp; boekingen</h3>
        <p className="max-w-xl text-xs text-muted">
          <strong>Duur</strong> = lengte van één afspraak (slot). <strong>Stap</strong> = elke hoeveel minuten een
          nieuwe start (kleiner dan de duur = overlappende blokken). Leeg bij stap = zelfde als duur.
        </p>
        <label className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
          <input
            type="checkbox"
            checked={restrictOnlyOpen}
            onChange={(e) => {
              const v = e.target.checked;
              setRestrictOnlyOpen(v);
              if (v) setWeekdayMask(0);
              else if (weekdayMask === 0) setWeekdayMask(62);
            }}
          />
          <span>
            <strong>Alleen dagen die ik als open markeer</strong> (Agenda → Open dagen). Aanbevolen: geen
            automatische ma–vr-sloten; gasten zien enkel data die u daar oranje zet.
          </span>
        </label>
        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            Titel
            <input className="max-w-xl rounded border border-line px-2 py-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            Slug
            <input className="max-w-md rounded border border-line px-2 py-1.5" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Afspraakduur (min)
            <input
              type="number"
              min={5}
              className="max-w-[8rem] rounded border border-line px-2 py-1.5"
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
              className="max-w-[8rem] rounded border border-line px-2 py-1.5"
              value={slotStepMinutes}
              onChange={(e) => setSlotStepMinutes(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-medium text-ink">Aantal openingen per tijdslot</span>
            <span className="text-[11px] font-normal text-muted">
              Hoeveel afspraken op hetzelfde startuur tegelijk mogelijk zijn (standaard voor nieuwe sloten).
            </span>
            <input
              type="number"
              min={1}
              className="max-w-[8rem] rounded border border-line px-2 py-1.5"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Sorteervolgorde
            <input
              type="number"
              className="max-w-[8rem] rounded border border-line px-2 py-1.5"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            Kleur
            <input type="color" className="h-9 w-14 rounded border border-line" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-medium text-ink">Tekstkleur in planning</span>
            <span className="text-[11px] font-normal text-muted">
              Tekst op het gekleurde blok (week/dag/maand): kies zwart als uw accentkleur te licht is.
            </span>
            <select
              className="max-w-xs rounded border border-line px-2 py-1.5 text-sm"
              value={planningTextOnColor}
              onChange={(e) => setPlanningTextOnColor(e.target.value === 'black' ? 'black' : 'white')}
            >
              <option value="white">Wit (standaard)</option>
              <option value="black">Zwart</option>
            </select>
          </label>
        </div>

        <div className="max-w-lg space-y-3 rounded-md border border-line bg-panel/40 p-3 text-xs">
          <p className="text-[11px] font-semibold text-ink">Standaarduren &amp; pauze (open dagen / autovulling)</p>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <label className="grid gap-0.5">
              <span className="text-muted">Van</span>
              <input
                type="time"
                className="h-9 w-[7.25rem] rounded border border-line px-2 py-1 font-medium tabular-nums"
                value={dayStart}
                onChange={(e) => setDayStart(e.target.value)}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="text-muted">Tot</span>
              <input
                type="time"
                className="h-9 w-[7.25rem] rounded border border-line px-2 py-1 font-medium tabular-nums"
                value={dayEnd}
                onChange={(e) => setDayEnd(e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-line/60 pt-3">
            <label className="grid gap-0.5">
              <span className="text-muted">Pauze van</span>
              <input
                type="time"
                className="h-9 w-[7.25rem] rounded border border-line px-2 py-1 font-medium tabular-nums"
                value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)}
              />
            </label>
            <label className="grid gap-0.5">
              <span className="text-muted">Pauze tot</span>
              <input
                type="time"
                className="h-9 w-[7.25rem] rounded border border-line px-2 py-1 font-medium tabular-nums"
                value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)}
              />
            </label>
          </div>
        </div>

        {!restrictOnlyOpen ? (
          <>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Weekdag-autovulling (optioneel)</h4>
            <p className="text-xs text-muted">
              Uitgeschakeld zolang hierboven &quot;alleen open dagen&quot; aan staat. Als u dit gebruikt: voor elke
              aangevinkte weekdag worden ontbrekende sloten automatisch aangemaakt wanneer een gast de agenda bekijkt.
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_TOGGLE.map(({ dow, label }) => {
                const on = (weekdayMask & (1 << dow)) !== 0;
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleWeekday(dow)}
                    className={[
                      'rounded-md border px-3 py-2 text-xs font-medium',
                      on ? 'border-burgundy bg-burgundy text-white' : 'border-line bg-white text-muted hover:bg-panel',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="rounded-md bg-zinc-50 px-2 py-2 text-[11px] text-muted">
            Weekdag-autovulling staat uit. Markeer vrije dagen onder <strong>Open dagen</strong>; sloten worden dan
            automatisch aangemaakt voor die data (volgens van/tot en starturen hierboven).
          </p>
        )}

        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Actief
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={publicBooking} onChange={(e) => setPublicBooking(e.target.checked)} />
          Publiek boekbaar
        </label>
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" checked={showEndTimeOnPublic} onChange={(e) => setShowEndTimeOnPublic(e.target.checked)} />
          <span>
            <strong>Einduur tonen</strong> bij online boeken (uit = alleen startuur zichtbaar voor de gast).
          </span>
        </label>

        <div className="max-w-xl rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <label className="flex items-start gap-2 text-xs leading-snug">
            <input
              type="checkbox"
              className="mt-0.5 shrink-0"
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
              <strong>Starturen beperken</strong> — alleen aangevinkte uren worden automatisch aangemaakt (anders:
              alle halve uren tussen van en tot, volgens stap).
            </span>
          </label>
          {restrictStarts ? (
            <div className="mt-2.5 flex max-w-lg flex-wrap gap-1">
              {chipStarts.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleStartChip(m)}
                  className={[
                    'min-w-[3.25rem] rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                    selectedStartsMin.has(m) ? 'bg-burgundy text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-300',
                  ].join(' ')}
                >
                  {minToLabel(m)}
                </button>
              ))}
              {!chipStarts.length ? (
                <span className="text-[11px] text-muted">Pas standaard van/tot en duur aan voor suggesties.</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <button type="submit" className="rounded-md bg-burgundy px-4 py-2 text-sm text-white hover:bg-burgundyDeep">
          Instellingen opslaan
        </button>
      </form>

      <section className="rounded-md border border-line bg-zinc-50 p-4 text-xs text-muted shadow-sm">
        <p>
          <strong className="text-ink">Open dagen</strong> stelt u in onder Agenda → Open dagen. Daarna worden
          automatisch momenten gemaakt volgens de uren hierboven (geen aparte tijden invoeren).
        </p>
      </section>

      {isDirty ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink">U hebt niet-opgeslagen wijzigingen in de instellingen hierboven.</p>
            <button
              type="submit"
              form={settingsFormId}
              className="rounded-md bg-burgundy px-4 py-2 text-sm font-semibold text-white hover:bg-burgundyDeep"
            >
              Instellingen opslaan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
