'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { getApiBase, parseApiErrorBody } from '@/lib/api';

type Snip = {
  id: string;
  slug: string;
  version: string;
  enabled: boolean;
  manifest: { name?: string; description?: string; hooks?: string[] };
  bundlePath: string;
  createdAt: string;
};

export default function AdminSnippetsPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<Snip[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canWrite = can('admin.snippets.write');

  const load = useCallback(async () => {
    if (!token) return;
    setRows(await adminFetch<Snip[]>('/admin/snippets', token));
  }, [token]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const upload = async (file: File) => {
    if (!token || !canWrite) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${getApiBase()}/admin/snippets/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(parseApiErrorBody(await res.text()));
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Upload mislukt');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggle = async (row: Snip) => {
    if (!token || !canWrite) return;
    setBusy(true);
    setErr(null);
    try {
      await adminFetch(`/admin/snippets/${row.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !row.enabled }),
      });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Wijzigen mislukt');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Snip) => {
    if (!token || !canWrite) return;
    if (!window.confirm(`Snippet «${row.slug}» definitief verwijderen?`)) return;
    setBusy(true);
    setErr(null);
    try {
      await adminFetch(`/admin/snippets/${row.id}`, token, { method: 'DELETE' });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Verwijderen mislukt');
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Snippets / plugins</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Upload kleine uitbreidingen (zoals WordPress-plugins): een ZIP met{' '}
          <code className="rounded bg-panel px-1">cm-plugin.json</code> en <code className="rounded bg-panel px-1">index.js</code>,
          of één <code className="rounded bg-panel px-1">.js</code> met een manifest-comment bovenaan. Na upload eerst
          controleren, daarna <strong className="font-medium text-ink">Activeren</strong>. Actieve code draait
          beperkt (sandbox) en kan hooks gebruiken zoals <code className="rounded bg-panel px-1">site.head</code>.
        </p>
      </div>

      {canWrite ? (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".zip,.js"
            className="text-sm"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          {busy ? <span className="text-sm text-muted">Bezig…</span> : null}
        </div>
      ) : (
        <p className="text-sm text-amber-900">Je rol heeft alleen leesrechten voor snippets.</p>
      )}

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <details className="rounded border border-line bg-panel/40 p-3 text-xs text-muted">
        <summary className="cursor-pointer font-medium text-ink">Voorbeeld index.js</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{`/* cm-plugin: {"slug":"voorbeeld","name":"Voorbeeld","version":"1.0.0","hooks":["site.head"]} */
module.exports = function (api) {
  api.on('site.head', function () {
    return '<!-- actieve snippet -->';
  });
};`}</pre>
        <p className="mt-2">
          ZIP-variant: map met <code>cm-plugin.json</code> (zelfde velden) + <code>index.js</code>.
        </p>
      </details>

      <ul className="divide-y divide-line rounded border border-line bg-white shadow-sm">
        {rows.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted">Geen snippets — upload een bestand om te beginnen.</li>
        ) : null}
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-ink">
                {r.manifest?.name ?? r.slug}{' '}
                <span className="text-muted">
                  v{r.version} · {r.enabled ? 'actief' : 'uit'}
                </span>
              </p>
              {r.manifest?.description ? <p className="text-xs text-muted">{r.manifest.description}</p> : null}
              {r.manifest?.hooks?.length ? (
                <p className="text-xs text-muted">Hooks: {r.manifest.hooks.join(', ')}</p>
              ) : null}
            </div>
            {canWrite ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggle(r)}
                  className="rounded border border-line px-3 py-1 text-xs hover:bg-panel disabled:opacity-50"
                >
                  {r.enabled ? 'Deactiveren' : 'Activeren'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(r)}
                  className="rounded border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Verwijderen
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
