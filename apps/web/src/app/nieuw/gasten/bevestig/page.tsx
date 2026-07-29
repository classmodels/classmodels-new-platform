'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getApiBase } from '@/lib/api';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

type ConfirmPreview = {
  ok: boolean;
  cancelled?: boolean;
  title?: string;
  alreadyAcknowledged?: boolean;
  canConfirm?: boolean;
  appointmentYmd?: string;
  todayYmd?: string;
  timeLabel?: string;
  message?: string | null;
};

function BevestigInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'idle' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<ConfirmPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const homeHref = '/nieuw';

  useEffect(() => {
    if (!token?.trim()) {
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `${getApiBase()}/agenda/confirm-preview?token=${encodeURIComponent(token.trim())}`,
        );
        const data = (await res.json()) as ConfirmPreview;
        if (!cancelled) setPreview(res.ok ? data : null);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const bevestig = async () => {
    if (!token?.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${getApiBase()}/agenda/confirm-attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const text = await res.text();
      if (!res.ok) {
        let m = text || res.statusText;
        try {
          const j = JSON.parse(text) as { message?: string | string[] };
          if (Array.isArray(j.message)) m = j.message.join(', ');
          else if (j.message) m = String(j.message);
        } catch {
          /**/
        }
        throw new Error(m);
      }
      setDone('ok');
      setMsg('Bedankt — uw komst is bevestigd. Tot binnenkort bij Class Models.');
    } catch (e: unknown) {
      setDone('err');
      setMsg(e instanceof Error ? e.message : 'Bevestigen mislukt.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="nieuw-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p className="nieuw-lead" style={{ margin: 0 }}>
          Deze link is ongeldig of onvolledig.
        </p>
        <div style={{ marginTop: 28 }}>
          <Link className="nieuw-btn" href={homeHref}>
            Naar de website
          </Link>
        </div>
      </div>
    );
  }

  if (done === 'ok') {
    return (
      <div className="nieuw-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p className="nieuw-h2" style={{ fontSize: 24 }}>
          Komst bevestigd
        </p>
        <p className="nieuw-lead" style={{ margin: '14px auto 0', textAlign: 'center' }}>
          {msg}
        </p>
        <div style={{ marginTop: 28 }}>
          <Link className="nieuw-btn" href={homeHref}>
            Sluiten
          </Link>
        </div>
      </div>
    );
  }

  const canConfirm = preview?.canConfirm !== false;
  const blockedMsg = preview?.message ?? (done === 'err' ? msg : null);
  const showBlocked = !previewLoading && preview && !canConfirm && blockedMsg;

  return (
    <div className="nieuw-panel" style={{ padding: '32px 24px', maxWidth: 520, margin: '0 auto' }}>
      <h1 className="nieuw-h2" style={{ fontSize: 28 }}>
        Komst bevestigen
      </h1>
      {preview?.title ? (
        <p style={{ marginTop: 8, fontSize: 15, fontWeight: 600 }}>{preview.title}</p>
      ) : null}
      {preview?.timeLabel && preview.appointmentYmd ? (
        <p className="nieuw-lead" style={{ marginTop: 8, textAlign: 'left' }}>
          Afspraak: {preview.appointmentYmd} · {preview.timeLabel}
        </p>
      ) : null}
      <p className="nieuw-lead" style={{ marginTop: 12, textAlign: 'left' }}>
        Dit kan op de dag <strong>vóór</strong> uw afspraak of op de <strong>dag zelf</strong> tot het{' '}
        <strong>einde</strong> van uw tijdslot (Belgische tijd).
      </p>
      {previewLoading ? (
        <p className="nieuw-lead" style={{ marginTop: 16, textAlign: 'left' }}>
          Afspraak laden…
        </p>
      ) : null}
      {preview?.alreadyAcknowledged ? (
        <p
          style={{
            marginTop: 16,
            borderRadius: 8,
            border: '1px solid #a7f3d0',
            background: '#ecfdf5',
            padding: '10px 12px',
            fontSize: 14,
            color: '#065f46',
          }}
        >
          Uw komst is al bevestigd. Bedankt!
        </p>
      ) : null}
      {preview?.cancelled ? (
        <p
          style={{
            marginTop: 16,
            borderRadius: 8,
            border: '1px solid #fde68a',
            background: '#fffbeb',
            padding: '10px 12px',
            fontSize: 14,
            color: '#92400e',
          }}
        >
          {preview.message ?? 'Deze afspraak is geannuleerd.'}
        </p>
      ) : null}
      {showBlocked ? (
        <p
          style={{
            marginTop: 16,
            borderRadius: 8,
            border: '1px solid #fde68a',
            background: '#fffbeb',
            padding: '10px 12px',
            fontSize: 14,
            color: '#92400e',
          }}
        >
          {blockedMsg}
        </p>
      ) : null}
      {done === 'err' && msg && !showBlocked ? (
        <p
          style={{
            marginTop: 16,
            borderRadius: 8,
            border: '1px solid #fde68a',
            background: '#fffbeb',
            padding: '10px 12px',
            fontSize: 14,
            color: '#92400e',
          }}
        >
          {msg}
        </p>
      ) : null}
      <button
        type="button"
        className="nieuw-btn"
        style={{ marginTop: 24, width: '100%' }}
        disabled={
          busy ||
          previewLoading ||
          !canConfirm ||
          Boolean(preview?.cancelled) ||
          Boolean(preview?.alreadyAcknowledged)
        }
        onClick={bevestig}
      >
        {busy ? 'Bezig…' : 'Ik bevestig mijn komst'}
      </button>
      <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
        <Link href={homeHref} style={{ textDecoration: 'underline' }}>
          Terug naar de website
        </Link>
      </p>
    </div>
  );
}

export default function NieuwBevestigPage() {
  return (
    <NieuwShell portal="gasten">
      <section className="nieuw-sectie" style={{ paddingTop: 28 }}>
        <div className="nieuw-wrap">
          <Suspense
            fallback={
              <div className="nieuw-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
                Laden…
              </div>
            }
          >
            <BevestigInner />
          </Suspense>
        </div>
      </section>
    </NieuwShell>
  );
}
