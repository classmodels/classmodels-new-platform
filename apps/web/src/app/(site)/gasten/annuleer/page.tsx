'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getApiBase } from '@/lib/api';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

type CancelPreview = {
  calendarSlug: string;
  calendarTitle: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  alreadyCancelled: boolean;
};

function rebookHrefForSlug(slug: string | undefined): string {
  if (!slug || !/^[a-zA-Z0-9-]+$/.test(slug)) return '/';
  const s = slug.toLowerCase();
  if (s.includes('gratis') || s.includes('fotoshoot') || s.includes('testshoot')) {
    return '/gasten/gratis-fotoshoot#agenda';
  }
  if (s.includes('casting')) return '/gasten/casting#agenda';
  if (s.includes('intake')) return '/gasten/intake#agenda';
  return '/';
}

function AnnuleerInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'idle' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<CancelPreview | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [wantsReschedule, setWantsReschedule] = useState(false);

  useEffect(() => {
    if (!token?.trim()) return;
    let cancelled = false;
    void fetch(`${getApiBase()}/agenda/cancel-preview?token=${encodeURIComponent(token.trim())}`)
      .then(async (res) => {
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
        return JSON.parse(text) as CancelPreview;
      })
      .then((j) => {
        if (!cancelled) {
          setPreview(j);
          setPreviewErr(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setPreview(null);
          setPreviewErr(e instanceof Error ? e.message : 'Kon afspraak niet laden.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const annuleer = async () => {
    if (!token?.trim()) return;
    const r = reason.trim();
    if (r.length < 3) {
      setMsg('Geef een reden voor annulatie (minstens 3 tekens).');
      setDone('err');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${getApiBase()}/agenda/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          reason: r,
          wantsNewAppointment: wantsReschedule,
        }),
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
      const j = JSON.parse(text) as { alreadyCancelled?: boolean; title?: string };
      setDone('ok');
      if (j.alreadyCancelled) {
        setMsg('Deze afspraak was al geannuleerd.');
      } else {
        setMsg('Uw afspraak is geannuleerd. U ontvangt geen herinnering meer voor dit moment.');
      }
    } catch (e: unknown) {
      setDone('err');
      setMsg(e instanceof Error ? e.message : 'Annuleren mislukt.');
    } finally {
      setBusy(false);
    }
  };

  const homeHref = '/';
  const rebookHref = rebookHrefForSlug(preview?.calendarSlug);

  if (preview?.alreadyCancelled && done !== 'ok') {
    return (
      <div className="nieuw-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p className="nieuw-h2" style={{ fontSize: 24 }}>
          Deze afspraak is al geannuleerd
        </p>
        <p className="nieuw-lead" style={{ margin: '14px auto 0', textAlign: 'center' }}>
          {preview.calendarTitle}
        </p>
        <div style={{ marginTop: 28 }}>
          <Link className="nieuw-btn" href={homeHref}>
            Naar de website
          </Link>
        </div>
      </div>
    );
  }

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
          Annulering bevestigd
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

  return (
    <div className="nieuw-panel" style={{ padding: '32px 24px', maxWidth: 520, margin: '0 auto' }}>
      <h1 className="nieuw-h2" style={{ fontSize: 28 }}>
        Afspraak annuleren
      </h1>
      {previewErr ? <p style={{ marginTop: 12, color: '#92400e' }}>{previewErr}</p> : null}
      {preview && !preview.alreadyCancelled ? (
        <p className="nieuw-lead" style={{ marginTop: 12, textAlign: 'left' }}>
          <strong>{preview.calendarTitle}</strong>
          {' · '}
          {preview.slotDate} om {preview.startTime}–{preview.endTime}
        </p>
      ) : preview?.alreadyCancelled ? (
        <p className="nieuw-lead" style={{ marginTop: 12, textAlign: 'left' }}>
          Deze afspraak was al geannuleerd.
        </p>
      ) : (
        <p className="nieuw-lead" style={{ marginTop: 12, textAlign: 'left' }}>
          Bezig met laden van de gegevens…
        </p>
      )}
      <p className="nieuw-lead" style={{ marginTop: 12, textAlign: 'left' }}>
        Het tijdslot wordt weer vrijgegeven. U moet een reden opgeven voordat u definitief annuleert.
      </p>
      <label style={{ display: 'block', marginTop: 24, fontSize: 14, fontWeight: 600 }}>
        Reden van annulatie <span style={{ color: '#dc2626' }}>*</span>
        <textarea
          rows={4}
          style={{
            marginTop: 8,
            width: '100%',
            resize: 'vertical',
            borderRadius: 8,
            border: '1px solid #d4d4d8',
            padding: '10px 12px',
            fontSize: 14,
          }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Waarom annuleert u deze afspraak?"
        />
      </label>
      <label style={{ display: 'flex', gap: 10, marginTop: 16, fontSize: 14, cursor: 'pointer' }}>
        <input
          type="checkbox"
          style={{ marginTop: 3 }}
          checked={wantsReschedule}
          onChange={(e) => setWantsReschedule(e.target.checked)}
        />
        <span>
          Ik wil nadien eventueel een nieuwe afspraak maken. U kunt nu al de boekingspagina openen; annuleer
          daarna terug op dit scherm.
        </span>
      </label>
      {wantsReschedule ? (
        <Link
          href={rebookHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 8, fontSize: 14, textDecoration: 'underline' }}
        >
          Open boekingspagina (nieuw tabblad)
        </Link>
      ) : null}
      {done === 'err' && msg ? (
        <p
          style={{
            marginTop: 16,
            borderRadius: 8,
            border: '1px solid #fecaca',
            background: '#fef2f2',
            padding: '10px 12px',
            fontSize: 14,
            color: '#991b1b',
          }}
        >
          {msg}
        </p>
      ) : null}
      <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button
          type="button"
          className="nieuw-btn"
          disabled={busy || preview?.alreadyCancelled}
          onClick={annuleer}
        >
          {busy ? 'Bezig…' : 'Ja, annuleren'}
        </button>
        <Link className="nieuw-btn nieuw-btn-ghost" href={homeHref}>
          Niet annuleren
        </Link>
      </div>
    </div>
  );
}

export default function NieuwAnnuleerPage() {
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
            <AnnuleerInner />
          </Suspense>
        </div>
      </section>
    </NieuwShell>
  );
}
