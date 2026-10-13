'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-api';

const HOME_SLUGS = new Set(['gratis-fotoshoot', 'modellendag']);

type WaveRow = { start: string; capacity: string };

type CalBits = {
  id: string;
  slug: string;
  agendaVisible?: boolean;
  homePublished?: boolean;
  showOccupiedHours?: boolean;
  homeKicker?: string | null;
  homeTitle?: string | null;
  homeLead?: string | null;
  homeBody?: string | null;
  homeHighlight?: string | null;
  homeClose?: string | null;
  homeButtonLabel?: string | null;
  homeImageUrl?: string | null;
  waveBooking?: boolean;
  waveSlotPlan?: Array<{ start?: string; capacity?: number }> | null;
};

export function GuestAgendaExtras({
  cal,
  token,
}: {
  cal: CalBits;
  token: string;
}) {
  const home = HOME_SLUGS.has(cal.slug);
  const wave = cal.slug === 'modellendag';
  const [agendaVisible, setAgendaVisible] = useState(cal.agendaVisible !== false);
  const [homePublished, setHomePublished] = useState(cal.homePublished === true);
  const [showOccupied, setShowOccupied] = useState(cal.showOccupiedHours === true);
  const [kicker, setKicker] = useState(cal.homeKicker ?? '');
  const [title, setTitle] = useState(cal.homeTitle ?? '');
  const [lead, setLead] = useState(cal.homeLead ?? '');
  const [body, setBody] = useState(cal.homeBody ?? '');
  const [highlight, setHighlight] = useState(cal.homeHighlight ?? '');
  const [close, setClose] = useState(cal.homeClose ?? '');
  const [button, setButton] = useState(cal.homeButtonLabel ?? 'Ga verder');
  const [image, setImage] = useState(cal.homeImageUrl ?? '');
  const [rows, setRows] = useState<WaveRow[]>(() =>
    (cal.waveSlotPlan ?? []).map((r) => ({
      start: String(r.start ?? ''),
      capacity: String(r.capacity ?? 1),
    })),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAgendaVisible(cal.agendaVisible !== false);
    setHomePublished(cal.homePublished === true);
    setShowOccupied(cal.showOccupiedHours === true);
    setKicker(cal.homeKicker ?? '');
    setTitle(cal.homeTitle ?? '');
    setLead(cal.homeLead ?? '');
    setBody(cal.homeBody ?? '');
    setHighlight(cal.homeHighlight ?? '');
    setClose(cal.homeClose ?? '');
    setButton(cal.homeButtonLabel ?? 'Ga verder');
    setImage(cal.homeImageUrl ?? '');
    setRows(
      (cal.waveSlotPlan ?? []).map((r) => ({
        start: String(r.start ?? ''),
        capacity: String(r.capacity ?? 1),
      })),
    );
  }, [cal]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await adminFetch(`/admin/agenda/calendars/${cal.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          agendaVisible,
          showOccupiedHours: showOccupied,
          ...(home
            ? {
                homePublished,
                homeKicker: kicker,
                homeTitle: title,
                homeLead: lead,
                homeBody: body,
                homeHighlight: highlight,
                homeClose: close,
                homeButtonLabel: button,
                homeImageUrl: image,
              }
            : {}),
          ...(wave
            ? {
                waveBooking: true,
                waveSlotPlan: rows
                  .filter((r) => /^\d{1,2}:\d{2}$/.test(r.start.trim()))
                  .map((r) => ({
                    start: r.start.trim(),
                    capacity: Math.max(1, parseInt(r.capacity, 10) || 1),
                  })),
              }
            : {}),
        }),
      });
      setMsg('Agenda-opties opgeslagen.');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(false);
    }
  };

  if (!home && !wave && cal.slug !== 'intake-gesprek' && cal.slug !== 'gratis-fotoshoot') {
    return null;
  }

  return (
    <section className="mx-auto max-w-2xl space-y-3 rounded-md border border-line bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-ink">Zichtbaarheid, beginpagina en uren</h3>
      {msg ? <p className="text-xs text-ink">{msg}</p> : null}
      <label className="flex items-center gap-2 text-xs text-ink">
        <input type="checkbox" checked={agendaVisible} onChange={(e) => setAgendaVisible(e.target.checked)} />
        Agenda zichtbaar in het inschrijfformulier
      </label>
      <label className="flex items-center gap-2 text-xs text-ink">
        <input type="checkbox" checked={showOccupied} onChange={(e) => setShowOccupied(e.target.checked)} />
        Bezette uren rood met «bezet»
      </label>
      {home ? (
        <>
          <label className="flex items-center gap-2 text-xs text-ink">
            <input type="checkbox" checked={homePublished} onChange={(e) => setHomePublished(e.target.checked)} />
            Beginpagina publiceren (alleen bezoekers die niet ingelogd zijn)
          </label>
          <p className="text-[11px] text-muted">
            De foto en de knop gaan naar deze agenda. Publiceren en zichtbaar zijn los van elkaar.
            Staan beide beginpagina&apos;s aan, dan zien bezoekers de gratis fotoshoot.
          </p>
          <label className="block text-xs">
            Afbeelding (pad of link)
            <input className="mt-1 w-full rounded border border-line px-2 py-1" value={image} onChange={(e) => setImage(e.target.value)} />
          </label>
          <label className="block text-xs">
            Knop
            <input className="mt-1 w-full rounded border border-line px-2 py-1" value={button} onChange={(e) => setButton(e.target.value)} />
          </label>
          <label className="block text-xs">
            Kleine regel boven de titel
            <input className="mt-1 w-full rounded border border-line px-2 py-1" value={kicker} onChange={(e) => setKicker(e.target.value)} />
          </label>
          <label className="block text-xs">
            Titel
            <input className="mt-1 w-full rounded border border-line px-2 py-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block text-xs">
            Ondertitel
            <input className="mt-1 w-full rounded border border-line px-2 py-1" value={lead} onChange={(e) => setLead(e.target.value)} />
          </label>
          <label className="block text-xs">
            Tekst (lege regel = nieuwe alinea, regel met «- » = opsomming)
            <textarea className="mt-1 min-h-40 w-full rounded border border-line px-2 py-1" value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <label className="block text-xs">
            Gemarkeerde zin
            <textarea className="mt-1 w-full rounded border border-line px-2 py-1" value={highlight} onChange={(e) => setHighlight(e.target.value)} />
          </label>
          <label className="block text-xs">
            Slotzin
            <input className="mt-1 w-full rounded border border-line px-2 py-1" value={close} onChange={(e) => setClose(e.target.value)} />
          </label>
        </>
      ) : null}
      {wave ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-ink">Uren op de modellendag</p>
          <p className="text-[11px] text-muted">
            Zet per uur hoeveel afspraken mogen. Is een uur vol, dan wordt dat uur volzet en komt het volgende uur in beeld.
          </p>
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                className="rounded border border-line px-2 py-1 text-xs"
                value={row.start}
                onChange={(e) =>
                  setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, start: e.target.value } : r)))
                }
              />
              <label className="flex items-center gap-1 text-xs">
                Aantal
                <input
                  type="number"
                  min={1}
                  className="w-16 rounded border border-line px-2 py-1"
                  value={row.capacity}
                  onChange={(e) =>
                    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, capacity: e.target.value } : r)))
                  }
                />
              </label>
              <button
                type="button"
                className="text-xs text-red-800"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Weg
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded border border-line px-2 py-1 text-xs"
            onClick={() => setRows((prev) => [...prev, { start: '12:00', capacity: '4' }])}
          >
            Uur toevoegen
          </button>
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded-md bg-burgundy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Bezig…' : 'Deze opties opslaan'}
      </button>
    </section>
  );
}
