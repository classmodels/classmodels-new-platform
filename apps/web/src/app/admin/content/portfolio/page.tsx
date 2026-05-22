'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { apiFetch } from '@/lib/api';
import { PORTFOLIO_CONTENT_FIELDS } from '@/lib/portfolio-content-fields';

type Str = { key: string; value: string };

export default function AdminPortfolioContentPage() {
  const { token, can } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<Str[]>('/content/strings').catch(() => [] as Str[]);
    const map: Record<string, string> = {};
    for (const f of PORTFOLIO_CONTENT_FIELDS) {
      const row = data.find((r) => r.key === f.key);
      map[f.key] = row?.value?.trim() ? row.value : f.defaultValue;
    }
    setValues(map);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      for (const f of PORTFOLIO_CONTENT_FIELDS) {
        const value = values[f.key] ?? f.defaultValue;
        try {
          await adminFetch('/content/strings', token, {
            method: 'PATCH',
            body: JSON.stringify({ key: f.key, value }),
          });
        } catch {
          await adminFetch('/content/strings', token, {
            method: 'POST',
            body: JSON.stringify({ key: f.key, value }),
          });
        }
      }
      setMsg('Opgeslagen. Vernieuw het modelportaal (Portfolio afspraak) om het resultaat te zien.');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(false);
    }
  };

  if (!can('content.strings.write')) {
    return <p className="text-sm text-muted">Geen rechten om teksten te bewerken.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <Link href="/admin/content" className="text-xs text-burgundy underline">
          ← Alle content
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-ink">Portfolio-teksten</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Hier past u <strong>alle teksten</strong> aan die modellen zien bij{' '}
          <strong>Portfolio afspraak</strong> (Info portfolio, geen afspraak, enz.). Geen technische sleutels
          nodig — vul de velden in en klik <strong>Alles opslaan</strong>.
        </p>
        <p className="mt-2 text-sm">
          <Link
            href="/portal/model?tab=portfolio"
            className="font-medium text-burgundy underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open portfolio-pagina in nieuw tabblad
          </Link>
          {' '}
          om te controleren.
        </p>
      </div>

      <div className="space-y-5 rounded-lg border border-line bg-white p-4 shadow-sm">
        {PORTFOLIO_CONTENT_FIELDS.map((f) => (
          <label key={f.key} className="block space-y-1">
            <span className="text-sm font-medium text-ink">{f.label}</span>
            <span className="block text-xs text-muted">{f.hint}</span>
            <textarea
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm text-ink"
              rows={f.rows}
              value={values[f.key] ?? f.defaultValue}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          </label>
        ))}

        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded bg-burgundy px-4 py-2 text-sm font-semibold text-white hover:bg-burgundyDeep disabled:opacity-50"
        >
          {busy ? 'Opslaan…' : 'Alles opslaan'}
        </button>
        {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
      </div>

      <details className="rounded border border-line bg-panel/30 p-3 text-xs text-muted">
        <summary className="cursor-pointer font-medium text-ink">Alternatief: direct op de site bewerken</summary>
        <ol className="mt-2 list-decimal list-inside space-y-1">
          <li>
            Ga naar{' '}
            <Link href="/portal/model?tab=portfolio" className="text-burgundy underline">
              modelportaal → Portfolio afspraak
            </Link>
          </li>
          <li>
            Klik bovenaan in de zwarte balk op <strong>Tekst bewerken</strong>
          </li>
          <li>Klik op de tekst op de pagina en typ uw wijziging</li>
          <li>Klik nogmaals op Tekst bewerken om op te slaan</li>
        </ol>
      </details>
    </div>
  );
}
