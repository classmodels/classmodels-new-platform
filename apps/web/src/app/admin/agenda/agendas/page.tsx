'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
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
};

export default function AdminAgendaCalendarsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Cal[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const [newSlug, setNewSlug] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const list = await adminFetch<Cal[]>('/admin/agenda/calendars', token);
    setRows(list);
  }, [token]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!token || !newSlug.trim() || !newTitle.trim()) return;
    try {
      await adminFetch('/admin/agenda/calendars', token, {
        method: 'POST',
        body: JSON.stringify({
          slug: newSlug.trim().toLowerCase(),
          title: newTitle.trim(),
        }),
      });
      setNewSlug('');
      setNewTitle('');
      setMsg('Agenda aangemaakt (met standaardformulier).');
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    }
  };

  const patch = async (c: Cal, patch: Partial<Cal>) => {
    if (!token) return;
    setMsg(null);
    try {
      await adminFetch(`/admin/agenda/calendars/${c.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          title: patch.title ?? c.title,
          slug: patch.slug ?? c.slug,
          active: patch.active ?? c.active,
          publicBooking: patch.publicBooking ?? c.publicBooking,
          restrictToOpenDays:
            patch.restrictToOpenDays !== undefined ? patch.restrictToOpenDays : c.restrictToOpenDays,
          weekdayOpenMask:
            patch.weekdayOpenMask !== undefined ? patch.weekdayOpenMask : (c.weekdayOpenMask ?? 0),
          durationMinutes: patch.durationMinutes ?? c.durationMinutes,
          capacity: patch.capacity ?? c.capacity,
          sortOrder: patch.sortOrder ?? c.sortOrder,
          color: patch.color ?? c.color,
          description: patch.description !== undefined ? patch.description : c.description ?? '',
          defaultDayStartTime: patch.defaultDayStartTime ?? c.defaultDayStartTime,
          defaultDayEndTime: patch.defaultDayEndTime ?? c.defaultDayEndTime,
          breakStart: patch.breakStart !== undefined ? patch.breakStart : c.breakStart,
          breakEnd: patch.breakEnd !== undefined ? patch.breakEnd : c.breakEnd,
          slotStepMinutes: patch.slotStepMinutes !== undefined ? patch.slotStepMinutes : c.slotStepMinutes,
          optionalSlotStarts: patch.optionalSlotStarts !== undefined ? patch.optionalSlotStarts : c.optionalSlotStarts,
          showEndTimeOnPublic: patch.showEndTimeOnPublic !== undefined ? patch.showEndTimeOnPublic : c.showEndTimeOnPublic,
        }),
      });
      setEditId(null);
      setMsg('Opgeslagen.');
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Mislukt');
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-8">
      {msg ? <p className="text-xs text-ink">{msg}</p> : null}

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Nieuwe agenda (categorie)</h2>
        <p className="mt-1 text-xs text-muted">
          Slug wordt gebruikt in de URL/API (kleine letters, koppeltekens). Standaard krijgt de agenda hetzelfde
          contactformulier als de andere categorieën.
        </p>
        <form onSubmit={create} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Slug
            <input
              className="rounded border border-line px-2 py-1.5"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="bv. workshop"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            Titel
            <input
              className="min-w-[220px] rounded border border-line px-2 py-1.5"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Weergavenaam"
              required
            />
          </label>
          <button type="submit" className="rounded-md bg-burgundy px-4 py-2 text-white hover:bg-burgundyDeep">
            Aanmaken
          </button>
        </form>
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Bestaande agenda&apos;s</h2>
        <ul className="mt-3 divide-y divide-line">
          {rows.map((c) => (
            <li key={c.id} className="py-3 text-sm">
              {editId === c.id ? (
                <EditRow cal={c} onCancel={() => setEditId(null)} onSave={(p) => patch(c, p)} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-ink">{c.title}</span>
                    <span className="ml-2 text-xs text-muted">{c.slug}</span>
                    <span className="ml-2 text-xs text-muted">{c.durationMinutes} min · cap {c.capacity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/agenda/calendar/${c.id}`}
                      className="text-xs font-medium text-burgundy underline"
                    >
                      Uren &amp; dagen
                    </Link>
                    <span className={c.active ? 'text-xs text-emerald-700' : 'text-xs text-zinc-500'}>
                      {c.active ? 'actief' : 'inactief'}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-burgundy underline"
                      onClick={() => setEditId(c.id)}
                    >
                      Bewerken
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function toTimeInput(s?: string | null): string {
  if (!s) return '';
  const p = s.slice(0, 5);
  return /^\d{2}:\d{2}$/.test(p) ? p : '';
}

function EditRow({
  cal,
  onCancel,
  onSave,
}: {
  cal: Cal;
  onCancel: () => void;
  onSave: (p: Partial<Cal>) => void;
}) {
  const [title, setTitle] = useState(cal.title);
  const [slug, setSlug] = useState(cal.slug);
  const [active, setActive] = useState(cal.active);
  const [publicBooking, setPublicBooking] = useState(cal.publicBooking);
  const [restrictOnlyOpen, setRestrictOnlyOpen] = useState(cal.restrictToOpenDays !== false);
  const [weekdayMask, setWeekdayMask] = useState(typeof cal.weekdayOpenMask === 'number' ? cal.weekdayOpenMask : 0);
  const [durationMinutes, setDurationMinutes] = useState(String(cal.durationMinutes));
  const [capacity, setCapacity] = useState(String(cal.capacity));
  const [sortOrder, setSortOrder] = useState(String(cal.sortOrder));
  const [color, setColor] = useState(cal.color);
  const [dayStart, setDayStart] = useState(toTimeInput(cal.defaultDayStartTime) || '08:00');
  const [dayEnd, setDayEnd] = useState(toTimeInput(cal.defaultDayEndTime) || '18:00');
  const [breakStart, setBreakStart] = useState(toTimeInput(cal.breakStart));
  const [breakEnd, setBreakEnd] = useState(toTimeInput(cal.breakEnd));
  const [slotStep, setSlotStep] = useState(cal.slotStepMinutes != null ? String(cal.slotStepMinutes) : '');
  const [showEndTime, setShowEndTime] = useState(cal.showEndTimeOnPublic !== false);

  return (
    <div className="grid gap-2 rounded-md bg-zinc-50 p-3 text-xs sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        Titel
        <input className="rounded border border-line px-2 py-1" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        Slug
        <input className="rounded border border-line px-2 py-1" value={slug} onChange={(e) => setSlug(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        Duur (min)
        <input
          type="number"
          min={5}
          className="rounded border border-line px-2 py-1"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        Start elke … min (optioneel)
        <input
          type="number"
          min={5}
          placeholder="= duur"
          className="rounded border border-line px-2 py-1"
          value={slotStep}
          onChange={(e) => setSlotStep(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        Capaciteit
        <input
          type="number"
          min={1}
          className="rounded border border-line px-2 py-1"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        Sorteervolgorde
        <input
          type="number"
          className="rounded border border-line px-2 py-1"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        Kleur
        <input className="h-8 rounded border border-line px-1" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Actief
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={publicBooking} onChange={(e) => setPublicBooking(e.target.checked)} />
        Publiek boekbaar
      </label>
      <label className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 p-2">
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
        <span className="text-[11px] leading-snug">
          <strong>Alleen open dagen</strong> — online alleen op data die u onder Open dagen markeert.
        </span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={showEndTime} onChange={(e) => setShowEndTime(e.target.checked)} />
        Einduur tonen aan gasten
      </label>
      {!restrictOnlyOpen ? (
        <>
          <p className="col-span-full text-[11px] font-medium text-ink">Weekdag-autovulling (optioneel)</p>
      <div className="col-span-full flex flex-wrap gap-1">
        {[
          { dow: 1, label: 'Ma' },
          { dow: 2, label: 'Di' },
          { dow: 3, label: 'Wo' },
          { dow: 4, label: 'Do' },
          { dow: 5, label: 'Vr' },
          { dow: 6, label: 'Za' },
          { dow: 0, label: 'Zo' },
        ].map(({ dow, label }) => {
          const on = (weekdayMask & (1 << dow)) !== 0;
          return (
            <button
              key={dow}
              type="button"
              onClick={() => setWeekdayMask((m) => m ^ (1 << dow))}
              className={[
                'rounded border px-2 py-1 text-[11px] font-medium',
                on ? 'border-burgundy bg-burgundy text-white' : 'border-line bg-white text-muted',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>
        </>
      ) : (
        <p className="col-span-full text-[11px] text-muted">
          Weekdag-autovulling uit (alleen open dagen). Standaard uren stelt u per agenda in via Agenda&apos;s →
          agenda kiezen.
        </p>
      )}
      <p className="col-span-full text-[11px] text-muted">
        Standaard van/tot en pauze gelden voor automatisch aangemaakte sloten (open dagen of weekdag-modus).
      </p>
      <label className="flex flex-col gap-1">
        Standaard van
        <input type="time" className="rounded border border-line px-2 py-1" value={dayStart} onChange={(e) => setDayStart(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        Dag einde
        <input type="time" className="rounded border border-line px-2 py-1" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        Pauze van
        <input type="time" className="rounded border border-line px-2 py-1" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        Pauze tot
        <input type="time" className="rounded border border-line px-2 py-1" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
      </label>
      <div className="col-span-full flex gap-2 pt-2">
        <button
          type="button"
          className="rounded bg-burgundy px-3 py-1.5 text-white"
          onClick={() =>
            onSave({
              title,
              slug,
              active,
              publicBooking,
              restrictToOpenDays: restrictOnlyOpen,
              weekdayOpenMask: restrictOnlyOpen ? 0 : weekdayMask,
              showEndTimeOnPublic: showEndTime,
              durationMinutes: parseInt(durationMinutes, 10),
              slotStepMinutes: slotStep.trim() ? parseInt(slotStep, 10) : null,
              capacity: parseInt(capacity, 10),
              sortOrder: parseInt(sortOrder, 10),
              color,
              defaultDayStartTime: dayStart || undefined,
              defaultDayEndTime: dayEnd || undefined,
              breakStart: breakStart.trim() ? breakStart : null,
              breakEnd: breakEnd.trim() ? breakEnd : null,
            })
          }
        >
          Opslaan
        </button>
        <button type="button" className="rounded border border-line px-3 py-1.5" onClick={onCancel}>
          Annuleren
        </button>
      </div>
    </div>
  );
}
