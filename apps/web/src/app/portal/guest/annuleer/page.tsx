'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getApiBase } from '@/lib/api';

type CancelPreview = {
  calendarSlug: string;
  calendarTitle: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  alreadyCancelled: boolean;
};

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

  if (preview?.alreadyCancelled && done !== 'ok') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-base font-semibold text-zinc-900">Deze afspraak is al geannuleerd</p>
        <p className="mt-3 text-sm text-zinc-600">{preview.calendarTitle}</p>
        <Link
          href="/portal/guest"
          className="mt-6 inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Naar het gastenportaal
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-zinc-600">Deze link is ongeldig of onvolledig.</p>
        <Link href="/portal/guest" className="mt-4 inline-block text-sm font-medium text-burgundy underline">
          Naar het gastenportaal
        </Link>
      </div>
    );
  }

  if (done === 'ok') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-base font-semibold text-zinc-900">Annulering bevestigd</p>
        <p className="mt-3 text-sm text-zinc-600">{msg}</p>
        <Link
          href="/portal/guest"
          className="mt-6 inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sluiten
        </Link>
      </div>
    );
  }

  const rebookHref =
    preview?.calendarSlug && /^[a-zA-Z0-9-]+$/.test(preview.calendarSlug)
      ? `/portal/guest?book=${encodeURIComponent(preview.calendarSlug)}`
      : '/portal/guest';

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-lg font-semibold text-zinc-900">Afspraak annuleren</h1>
      {previewErr ? <p className="mt-2 text-sm text-amber-800">{previewErr}</p> : null}
      {preview && !preview.alreadyCancelled ? (
        <p className="mt-2 text-sm text-zinc-700">
          <span className="font-medium">{preview.calendarTitle}</span>
          {' · '}
          {preview.slotDate} om {preview.startTime}–{preview.endTime}
        </p>
      ) : preview?.alreadyCancelled ? (
        <p className="mt-2 text-sm text-zinc-600">Deze afspraak was al geannuleerd.</p>
      ) : (
        <p className="mt-2 text-sm text-zinc-600">Bezig met laden van de gegevens…</p>
      )}
      <p className="mt-3 text-sm text-zinc-600">
        Het tijdslot wordt weer vrijgegeven. U moet een reden opgeven voordat u definitief annuleert.
      </p>
      <label className="mt-6 block text-sm font-medium text-zinc-800">
        Reden van annulatie <span className="text-red-600">*</span>
        <textarea
          rows={4}
          className="mt-2 w-full resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Waarom annuleert u deze afspraak?"
        />
      </label>
      <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
        <input
          type="checkbox"
          className="mt-1"
          checked={wantsReschedule}
          onChange={(e) => setWantsReschedule(e.target.checked)}
        />
        <span>
          Ik wil nadien eventueel een nieuwe afspraak maken. U kunt nu al de boekingspagina openen; annuleer daarna
          terug op dit scherm.
        </span>
      </label>
      {wantsReschedule ? (
        <Link
          href={rebookHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-medium text-burgundy underline"
        >
          Open boekingspagina (nieuw tabblad)
        </Link>
      ) : null}
      {done === 'err' && msg ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{msg}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || preview?.alreadyCancelled}
          onClick={annuleer}
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {busy ? 'Bezig…' : 'Ja, annuleren'}
        </button>
        <Link
          href="/portal/guest"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Niet annuleren
        </Link>
      </div>
    </div>
  );
}

export default function AnnuleerPage() {
  return (
    <Suspense
      fallback={<div className="px-4 py-16 text-center text-sm text-zinc-500">Laden…</div>}
    >
      <AnnuleerInner />
    </Suspense>
  );
}
