'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase } from '@/lib/api';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';
import { CmText } from '@/components/CmText';
import { CmProgressOverlay } from '@/components/CmProgressOverlay';
import { downloadWithProgress, downloadProgressSublabel, type DownloadProgressUpdate } from '@/lib/download-with-progress';
import { PortfolioInfoContent } from '@/components/model-portal/portfolio-info-content';

const PORTFOLIO_ADDRESS = 'Class-Models, Provinciebaan 3, 2235 Hulshout';

type BookingRow = {
  id: string;
  slotId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  status: string;
};

export function ModelPortfolioTab({
  onHeaderRightChange,
}: {
  onHeaderRightChange?: (node: ReactNode | null) => void;
}) {
  const { token, can } = useAuth();
  const [booking, setBooking] = useState<BookingRow | null | undefined>(undefined);
  const [delivery, setDelivery] = useState<{
    available: boolean;
    fileCount: number;
    downloadedAt: string | null;
  } | null>(null);
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressUpdate | null>(null);
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
      const r = await apiFetch<{ booking: BookingRow | null }>('/portal/model/agenda/portfolio/my-booking', { token });
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

  const loadDelivery = useCallback(async () => {
    if (!token || !can('portal.model.media.read')) {
      setDelivery(null);
      return;
    }
    try {
      const r = await apiFetch<{
        available: boolean;
        fileCount: number;
        downloadedAt: string | null;
      }>('/portal/model/media/portfolio-delivery/status', { token });
      setDelivery({
        available: !!r.available,
        fileCount: typeof r.fileCount === 'number' ? r.fileCount : 0,
        downloadedAt: r.downloadedAt ?? null,
      });
    } catch {
      setDelivery({ available: false, fileCount: 0, downloadedAt: null });
    }
  }, [token, can]);

  useEffect(() => {
    void loadDelivery();
  }, [loadDelivery, booking]);

  const downloadPortfolioZip = useCallback(async () => {
    if (!token) return;
    setDeliveryBusy(true);
    setDownloadProgress({ percent: null, loaded: 0, total: null, indeterminate: true, phase: 'connecting' });
    try {
      await downloadWithProgress(`${getApiBase()}/portal/model/media/portfolio-delivery/zip`, {
        token,
        fallbackName: 'portfolio-class-models.zip',
        onProgress: setDownloadProgress,
      });
      await loadDelivery();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Download mislukt');
    } finally {
      setDeliveryBusy(false);
      setDownloadProgress(null);
    }
  }, [token, loadDelivery]);

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
    if (!window.confirm('Portfolio-afspraak annuleren?')) return;
    setErr(null);
    try {
      await apiFetch('/portal/model/agenda/portfolio/cancel-my', {
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
          panel === 'info' ? 'Terug' : 'Info portfolio',
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

  if (!token) return <p className="text-sm text-muted">Log in om uw portfolio-afspraak te beheren.</p>;
  if (!can('portal.model.agenda.read')) return <p className="text-sm text-muted">Geen toegang.</p>;

  const showDelivery =
    can('portal.model.media.read') && delivery !== null && delivery.available;
  const showDownloaded =
    can('portal.model.media.read') &&
    delivery !== null &&
    !delivery.available &&
    !!delivery.downloadedAt;

  return (
    <div className="space-y-5">
      {panel === 'info' ? (
        !onHeaderRightChange ? computedHeaderRight : null
      ) : !onHeaderRightChange ? (
        computedHeaderRight
      ) : null}
      {downloadProgress ? (
        <CmProgressOverlay
          label="Portfolio downloaden…"
          sublabel={`Dit kan even duren — ${downloadProgressSublabel(downloadProgress)}`}
          percent={downloadProgress.percent ?? undefined}
          indeterminate={downloadProgress.indeterminate}
        />
      ) : null}
      {showDelivery ? (
        <div className="border border-burgundy/40 bg-burgundy/5 px-4 py-3 text-[13px] leading-snug text-zinc-900">
          <p className="text-[11px] font-bold uppercase tracking-wide text-burgundy">Portfolio van je shoot</p>
          <p className="mt-1.5">
            Je foto&apos;s staan klaar om één keer te downloaden als ZIP in hoge kwaliteit
            {delivery.fileCount > 1 ? ` (${delivery.fileCount} bestanden)` : ''}. Daarna verdwijnen ze uit je account en
            van de server.
          </p>
          <button
            type="button"
            disabled={deliveryBusy}
            onClick={() => void downloadPortfolioZip()}
            className="mt-2 rounded bg-burgundy px-3 py-2 text-xs font-semibold text-white hover:bg-burgundyDeep disabled:opacity-50"
          >
            {deliveryBusy ? 'Bezig…' : 'Download portfolio'}
          </button>
        </div>
      ) : null}
      {showDownloaded ? (
        <div className="border border-line bg-panel px-4 py-3 text-[13px] leading-snug text-zinc-800">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Portfolio</p>
          <p className="mt-1.5">
            Uw foto&apos;s zijn gedownload
            {delivery.downloadedAt
              ? `, ${new Intl.DateTimeFormat('nl-BE', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(delivery.downloadedAt))}`
              : ''}
            .
          </p>
        </div>
      ) : null}
      {err ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</div> : null}

      {loading ? (
        <div className="text-sm text-zinc-500">Laden…</div>
      ) : panel === 'info' ? (
        <div className="nieuw-panel nieuw-panel--legend">
          <h1 className="nieuw-panel-legend">Fotoshoot voor Portfolio</h1>
          <PortfolioInfoContent />
        </div>
      ) : panel === 'book' ? (
        <div className="nieuw-panel">
          <GuestBookingPanel
            calendarSlug="portfolio"
            heading="Portfolio"
            variant="default"
            authToken={token}
            bookUrl="/portal/model/agenda/book-form"
            autoBookOnPick
            showOccupiedSlots
            onBookingSuccess={async () => {
              await load();
              setPanel('summary');
            }}
            onClose={() => setPanel('summary')}
          />
          <CmText
            as="p"
            contentKey="portal.model.portfolio.booking.hint"
            className="mt-2 text-[11px] leading-snug text-zinc-600"
            fallback="Klik op een moment om je meteen in te schrijven. Er zijn geen extra velden nodig."
          />
        </div>
      ) : booking ? (
        <div className="nieuw-panel">
          <p className="text-[13px] text-zinc-900">
            Uw portfolio-afspraak staat ingeboekt voor <strong>{fmtNl(booking.slotDate)}</strong> van{' '}
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
              <dd>{PORTFOLIO_ADDRESS}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="nieuw-panel text-[13px] leading-snug">
          <CmText
            as="p"
            contentKey="portal.model.portfolio.summary.empty.title"
            className="font-semibold text-[color:var(--n-gold)]"
            fallback="U hebt nog geen afspraak ingeboekt."
          />
          <CmText
            as="p"
            contentKey="portal.model.portfolio.summary.empty.body"
            className="mt-2"
            fallback='Klik rechtsboven op "Afspraak maken" om een moment te kiezen.'
          />
        </div>
      )}
    </div>
  );
}

