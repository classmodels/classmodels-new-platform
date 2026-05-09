'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { apiFetch } from '@/lib/api';

type Str = { key: string; value: string; locale: string };

export default function AdminContentPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Str[]>([]);
  const [n, setN] = useState({ key: '', value: '' });

  const load = useCallback(async () => {
    const data = await apiFetch<Str[]>('/content/strings');
    setRows(data);
  }, []);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const remove = async (key: string) => {
    if (!token || !confirm(`Sleutel ${key} verwijderen?`)) return;
    await adminFetch('/content/strings', token, {
      method: 'DELETE',
      body: JSON.stringify({ key }),
    });
    await load();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await adminFetch('/content/strings', token, {
      method: 'POST',
      body: JSON.stringify({ key: n.key, value: n.value }),
    });
    setN({ key: '', value: '' });
    await load();
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">Content (CMS-sleutels)</h1>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2 text-sm">
        <input
          className="rounded border border-line px-2 py-1"
          placeholder="nieuwe sleutel"
          value={n.key}
          onChange={(e) => setN({ ...n, key: e.target.value })}
          required
        />
        <input
          className="min-w-[200px] flex-1 rounded border border-line px-2 py-1"
          placeholder="waarde"
          value={n.value}
          onChange={(e) => setN({ ...n, value: e.target.value })}
          required
        />
        <button type="submit" className="rounded bg-burgundy px-3 py-1 text-white hover:bg-burgundyDeep">
          Toevoegen
        </button>
      </form>
      <p className="text-xs text-muted">
        Bewerken op de site: admin → &quot;Tekst aanpassen&quot; (inline). Hier beheer je nieuwe sleutels en
        verwijder je oude.
      </p>
      <ul className="divide-y divide-line rounded-md border border-line bg-white text-xs shadow-sm">
        {rows.map((r) => (
          <li key={r.key} className="flex items-start justify-between gap-2 px-3 py-2">
            <div>
              <code className="text-burgundy">{r.key}</code>
              <p className="mt-1 text-muted line-clamp-2">{r.value}</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-danger hover:underline"
              onClick={() => remove(r.key)}
            >
              Verwijder
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
