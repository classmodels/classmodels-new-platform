'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getApiBase } from '@/lib/api';

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
        <p className="text-base font-semibold text-zinc-900">Komst bevestigd</p>
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

  const canConfirm = preview?.canConfirm !== false;
  const blockedMsg = preview?.message ?? (done === 'err' ? msg : null);
  const showBlocked = !previewLoading && preview && !canConfirm && blockedMsg;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-lg font-semibold text-zinc-900">Komst bevestigen</h1>
      {preview?.title ? (
        <p className="mt-1 text-sm font-medium text-zinc-800">{preview.title}</p>
      ) : null}
      {preview?.timeLabel && preview.appointmentYmd ? (
        <p className="mt-1 text-sm text-zinc-600">
          Afspraak: {preview.appointmentYmd} · {preview.timeLabel}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-zinc-600">
        Dit kan op de dag <strong>vóór</strong> uw afspraak of op de <strong>dag zelf</strong> tot het{' '}
        <strong>einde</strong> van uw tijdslot (Belgische tijd).
      </p>
      {previewLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Afspraak laden…</p>
      ) : null}
      {preview?.alreadyAcknowledged ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Uw komst is al bevestigd. Bedankt!
        </p>
      ) : null}
      {preview?.cancelled ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {preview.message ?? 'Deze afspraak is geannuleerd.'}
        </p>
      ) : null}
      {showBlocked ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {blockedMsg}
        </p>
      ) : null}
      {done === 'err' && msg && !showBlocked ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{msg}</p>
      ) : null}
      <button
        type="button"
        disabled={busy || previewLoading || !canConfirm || Boolean(preview?.cancelled) || Boolean(preview?.alreadyAcknowledged)}
        onClick={bevestig}
        className="mt-6 w-full rounded-md bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0d9488] disabled:opacity-50"
      >
        {busy ? 'Bezig…' : 'Ik bevestig mijn komst'}
      </button>
      <p className="mt-4 text-center text-xs text-zinc-500">
        <Link href="/portal/guest" className="text-burgundy underline">
          Terug naar het gastenportaal
        </Link>
      </p>
    </div>
  );
}

export default function GuestBevestigPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-zinc-500">Laden…</div>}
    >
      <BevestigInner />
    </Suspense>
  );
}
