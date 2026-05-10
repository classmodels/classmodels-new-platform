'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getApiBase } from '@/lib/api';

export default function AdminAgendaMailPreviewPage() {
  const { token } = useAuth();
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const res = await fetch(`${getApiBase()}/admin/agenda/notifications/preview/booking-confirmation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const t = await res.text();
      if (!res.ok) throw new Error(t || res.statusText);
      setHtml(t);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Laden mislukt');
      setHtml(null);
    }
  }, [token]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Dit is hetzelfde HTML-sjabloon als de bevestigingsmail na een online boeking (met annuleren + komst bevestigen).
        Zonder <code className="rounded bg-zinc-100 px-1">SMTP_HOST</code> wordt er geen echte mail verstuurd; dan zie je
        de inhoud enkel hier of in de API-log.
      </p>
      <button
        type="button"
        onClick={() => load()}
        className="rounded border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink"
      >
        Vernieuwen
      </button>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {html ? (
        <div
          className="max-h-[80vh] overflow-auto rounded-lg border border-line bg-white p-2 shadow-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}
    </div>
  );
}
