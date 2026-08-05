'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';
import { OpleidingInfoContent } from '@/components/model-portal/opleiding-info-content';

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
    if (!window.confirm('Opleidingsafspraak annuleren?')) return;
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
    (label: string, onClick: () => void, primary?: boolean, danger?: boolean) => {
      const inline = !onHeaderRightChange;
      if (inline) {
        return (
          <button
            type="button"
            onClick={onClick}
            className={
              danger
                ? 'nieuw-btn nieuw-btn-ghost'
                : primary
                  ? 'nieuw-btn'
                  : 'nieuw-btn nieuw-btn-ghost'
            }
          >
            {label}
          </button>
        );
      }
      return (
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
      );
    },
    [onHeaderRightChange],
  );

  const computedHeaderRight = useMemo(() => {
    return (
      <div className={onHeaderRightChange ? 'cm-kp-actions' : 'nieuw-portal-toolbar cm-kp-actions'}>
        {headerBtn(
          panel === 'info' ? 'Terug' : 'Info opleiding',
          () => setPanel((p) => (p === 'info' ? 'summary' : 'info')),
        )}
        {panel === 'book' ? headerBtn('Terug', () => setPanel('summary')) : null}
        {booking ? headerBtn('Afspraak verplaatsen', () => setPanel('book'), true) : null}
        {!booking && panel !== 'book' && !loading
          ? headerBtn('Afspraak maken', () => setPanel('book'), true)
          : null}
        {booking ? headerBtn('Afspraak annuleren', cancelBooking, false, true) : null}
      </div>
    );
  }, [booking, cancelBooking, headerBtn, loading, onHeaderRightChange, panel]);

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
    <div className="space-y-5">
      {panel === 'info' ? (
        !onHeaderRightChange ? computedHeaderRight : null
      ) : !onHeaderRightChange ? (
        computedHeaderRight
      ) : null}
      {err ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</div> : null}

      {loading ? (
        <div className="text-sm text-zinc-500">Laden…</div>
      ) : panel === 'info' ? (
        <div className="nieuw-panel nieuw-panel--legend">
          <h1 className="nieuw-panel-legend">Inschrijven voor de basisopleiding</h1>
          <OpleidingInfoContent />
        </div>
      ) : panel === 'book' ? (
        <div className="nieuw-panel">
          <GuestBookingPanel
            calendarSlug="opleiding"
            heading="Opleiding"
            variant="pro"
            authToken={token}
            bookUrl="/portal/model/agenda/book-form"
            autoBookOnPick
            onBookingSuccess={async () => {
              await load();
              setPanel('summary');
            }}
            onClose={() => setPanel('summary')}
          />
          <p className="mt-2 text-[11px] leading-snug text-zinc-600">
            Klik op een vrij moment (14:00 – 17:00) om je meteen in te schrijven. Er zijn geen extra velden nodig.
          </p>
        </div>
      ) : booking ? (
        <div className="nieuw-panel">
          <p className="text-[13px] text-zinc-900">
            Uw opleidingsafspraak staat ingeboekt voor <strong>{fmtNl(booking.slotDate)}</strong> van{' '}
            <strong>{booking.startTime}</strong> tot <strong>{booking.endTime}</strong>.
          </p>
          <dl className="nieuw-portal-facts">
            <div>
              <dt>Datum</dt>
              <dd>{fmtNl(booking.slotDate)}</dd>
            </div>
            <div>
              <dt>Uur</dt>
              <dd className="tabular-nums">
                {booking.startTime} - {booking.endTime}
              </dd>
            </div>
            <div>
              <dt>Adres</dt>
              <dd>{OPLEIDING_ADDRESS}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="nieuw-panel text-[13px] leading-snug">
          <p className="font-semibold text-[color:var(--n-gold)]">U hebt nog geen afspraak ingeboekt.</p>
          <p className="mt-2" style={{ color: 'var(--n-mut)' }}>
            Klik rechtsboven op &quot;Afspraak maken&quot; om een beschikbare datum te kiezen. Per dag is er één moment:{' '}
            <strong style={{ color: 'var(--n-ink)' }}>14:00 tot 17:00</strong> (drie uur).
          </p>
        </div>
      )}
    </div>
  );
}
