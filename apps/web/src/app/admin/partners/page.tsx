'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { getApiBase } from '@/lib/api';

type Partner = {
  id: string;
  name: string;
  websiteUrl: string | null;
  imagePath: string;
  sortOrder: number;
  visible: boolean;
};

function previewSrc(imagePath: string): string {
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/partners/')) return imagePath;
  if (imagePath.startsWith('/uploads/')) {
    return `${getApiBase().replace(/\/$/, '')}${imagePath}`;
  }
  return imagePath;
}

export default function AdminPartnersPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Partner[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setRows(await adminFetch<Partner[]>('/admin/partners', token));
  }, [token]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !file) {
      setMsg('Kies een logo-bestand.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      if (websiteUrl.trim()) fd.append('websiteUrl', websiteUrl.trim());
      fd.append('sortOrder', sortOrder || '0');
      fd.append('visible', 'true');
      fd.append('file', file);
      const base = getApiBase().replace(/\/$/, '');
      const res = await fetch(`${base}/admin/partners`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      setName('');
      setWebsiteUrl('');
      setSortOrder('0');
      setFile(null);
      setMsg('Logo toegevoegd.');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Mislukt');
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, body: Partial<Partner>) => {
    if (!token) return;
    await adminFetch(`/admin/partners/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Dit logo verwijderen?')) return;
    await adminFetch(`/admin/partners/${id}`, token, { method: 'DELETE' });
    await load();
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Partnerlogo’s</h1>
        <p className="mt-1 text-sm text-muted">
          Verschijnen onderaan op de homepage en het klantenportaal onder “Wij hebben al
          samengewerkt met:”. Optionele website-link opent in een nieuw tabblad.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="space-y-3 rounded-md border border-line bg-white p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-ink">Nieuw logo toevoegen</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-muted">
            Naam
            <input
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm text-ink"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="bv. Hunkemöller"
            />
          </label>
          <label className="block text-xs text-muted">
            Website (optioneel)
            <input
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm text-ink"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className="block text-xs text-muted">
            Volgorde
            <input
              type="number"
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm text-ink"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </label>
          <label className="block text-xs text-muted">
            Logo-bestand
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-burgundy px-4 py-2 text-sm font-semibold text-white hover:bg-burgundyDeep disabled:opacity-55"
        >
          {busy ? 'Bezig…' : 'Toevoegen'}
        </button>
        {msg ? <p className="text-xs text-muted">{msg}</p> : null}
      </form>

      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-white p-3 text-sm shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc(r.imagePath)}
              alt={r.name}
              className="h-12 w-20 object-contain"
              style={{ border: '1px solid rgba(176,141,85,0.55)' }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{r.name}</p>
              <p className="truncate text-xs text-muted">{r.websiteUrl || 'Geen link'}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 hover:bg-panel"
                onClick={() => patch(r.id, { visible: !r.visible })}
              >
                {r.visible ? 'Verbergen' : 'Tonen'}
              </button>
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 text-red-700 hover:bg-panel"
                onClick={() => void remove(r.id)}
              >
                Verwijderen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
