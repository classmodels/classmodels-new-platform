'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';

const OPLEIDING_ADDRESS = 'Class-Models, Provinciebaan 3, 2235 Hulshout';

type BookingRow = {
  id: string;
  slotId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  status: string;
};

export function ModelOpleidingTab({
  onHeaderRightChange,
}: {
  onHeaderRightChange?: (node: ReactNode | null) => void;
}) {
  const { token, can } = useAuth();
  const [booking, setBooking] = useState<BookingRow | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [panel, setPanel] = useState<'summary' | 'book' | 'info'>('summary');
  // Header actions worden door de parent in de rode balk gezet.
  // We bewaren de state hier omdat de tab zelf de flow beheert.

  const load = useCallback(async () => {
    if (!token || !can('portal.model.agenda.read')) {
      setBooking(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await apiFetch<{ booking: BookingRow | null }>('/portal/model/agenda/opleiding/my-booking', {
        token,
      });
      setBooking(r.booking);
    } catch {
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [token, can]);

  useEffect(() => {
    void load();
  }, [load]);

  const fmtNl = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
    return new Intl.DateTimeFormat('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(y, m - 1, d));
  };

  const cancelBooking = useCallback(async () => {
    if (!token || !can('portal.model.agenda.book')) return;
    if (!window.confirm('Opleidingsafspraak verwijderen?')) return;
    setErr(null);
    try {
      await apiFetch('/portal/model/agenda/opleiding/cancel-my', {
        method: 'POST',
        token,
        body: '{}',
      });
      setBooking(null);
      setPanel('summary');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Annuleren mislukt');
    }
  }, [token, can, load]);

  const headerBtn = useCallback(
    (label: string, onClick: () => void, primary?: boolean, danger?: boolean) => (
      <button
        type="button"
        onClick={onClick}
        className={
          danger
            ? 'border border-white/70 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20'
            : primary
              ? 'border border-white bg-white px-3 py-1.5 text-[11px] font-semibold text-burgundy hover:bg-zinc-100'
              : 'border border-white/60 bg-white/0 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10'
        }
      >
        {label}
      </button>
    ),
    [],
  );

  const computedHeaderRight = useMemo(() => {
    return (
      <div className="flex flex-wrap gap-2">
        {headerBtn('Info opleiding', () => setPanel((p) => (p === 'info' ? 'summary' : 'info')))}
        {booking && panel !== 'book' ? headerBtn('Afspraak wijzigen', () => setPanel('book'), true) : null}
        {!booking && panel !== 'book' && !loading ? headerBtn('Afspraak maken', () => setPanel('book'), true) : null}
        {booking && panel !== 'book' ? headerBtn('Afspraak verwijderen', cancelBooking, false, true) : null}
      </div>
    );
  }, [booking, cancelBooking, headerBtn, loading, panel]);

  useEffect(() => {
    onHeaderRightChange?.(computedHeaderRight);
    return () => onHeaderRightChange?.(null);
  }, [computedHeaderRight, onHeaderRightChange]);

  if (!token) {
    return <p className="text-sm text-muted">Log in om uw opleidingsafspraak te beheren.</p>;
  }

  if (!can('portal.model.agenda.read')) {
    return (
      <p className="text-sm text-muted">
        Uw account heeft nog geen toegang tot online opleidingsafspraken. Neem contact op met Class-Models na een
        nieuwe registratie of herbouw van rechten.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {err ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</div> : null}

      {loading ? (
        <div className="text-sm text-zinc-500">Laden…</div>
      ) : panel === 'info' ? (
        <div className="space-y-2 border border-zinc-300 bg-zinc-50 px-4 py-3 text-[13px] leading-snug text-zinc-800">
          <p className="text-[11px] font-bold uppercase tracking-wide text-burgundy">Voorzien voor opleiding</p>
          <p>
            Tijdens de opleiding overlopen we de werking van Class-Models, houding, presentatie, opdrachten en
            verwachtingen. Breng een notitieboekje, comfortabele schoenen en eventueel enkele basisoutfits mee.
          </p>
          <p className="text-[12px] text-zinc-600">Het opleidingsmoment duurt drie uur: 14:00 tot 17:00.</p>
        </div>
      ) : panel === 'book' ? (
        <div className="border border-zinc-300 bg-white px-3 py-3">
          <GuestBookingPanel
            calendarSlug="opleiding"
            heading="Opleiding"
            variant="pro"
            authToken={token}
            bookUrl="/portal/model/agenda/book-form"
            hideLeftCalendar
            autoBookOnPick
            onBookingSuccess={async () => {
              await load();
              setPanel('summary');
            }}
            onClose={() => setPanel('summary')}
          />
          <p className="mt-2 text-[11px] leading-snug text-zinc-600">
            Klik op een dag (14:00 – 17:00) om je meteen in te schrijven. Er zijn geen extra velden nodig.
          </p>
        </div>
      ) : booking ? (
        <div className="border border-zinc-300 bg-white px-4 py-3">
          <p className="text-[13px] text-zinc-900">
            Uw opleidingsafspraak staat ingeboekt voor <strong>{fmtNl(booking.slotDate)}</strong> van{' '}
            <strong>{booking.startTime}</strong> tot <strong>{booking.endTime}</strong>.
          </p>
          <dl className="mt-3 divide-y divide-zinc-200 border border-zinc-200 text-[13px]">
            <div className="grid grid-cols-[110px_1fr] gap-2 px-3 py-1.5">
              <dt className="font-semibold text-zinc-700">Datum</dt>
              <dd className="text-right text-zinc-900">{fmtNl(booking.slotDate)}</dd>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-2 px-3 py-1.5">
              <dt className="font-semibold text-zinc-700">Uur</dt>
              <dd className="text-right tabular-nums text-zinc-900">
                {booking.startTime} - {booking.endTime}
              </dd>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-2 px-3 py-1.5">
              <dt className="font-semibold text-zinc-700">Adres</dt>
              <dd className="text-right text-zinc-900">{OPLEIDING_ADDRESS}</dd>
            </div>
          </dl>
          <div className="mt-3 border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[12px] leading-snug text-zinc-800">
            <p className="text-[11px] font-bold uppercase text-zinc-700">Voorzien voor opleiding</p>
            <p className="mt-1.5">
              Tijdens de opleiding overlopen we de werking van Class-Models, houding, presentatie, opdrachten en
              verwachtingen. Breng een notitieboekje, comfortabele schoenen en eventueel enkele basisoutfits mee.
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-zinc-300 bg-zinc-50 px-4 py-3 text-[13px] leading-snug text-zinc-800">
          <p className="font-semibold text-zinc-900">U hebt nog geen afspraak ingeboekt.</p>
          <p className="mt-2 text-zinc-700">
            Klik rechtsboven op &quot;Afspraak maken&quot; om een beschikbare datum te kiezen. Per dag is er één moment:{' '}
            <strong className="text-zinc-900">14:00 tot 17:00</strong> (drie uur).
          </p>
        </div>
      )}
    </div>
  );
}
