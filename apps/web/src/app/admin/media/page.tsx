'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { getApiBase } from '@/lib/api';

type Folder = {
  id: string;
  slug: string;
  label: string;
  assets: {
    id: string;
    originalName: string;
    storageKey: string;
    sizeBytes: number;
    webpKey?: string | null;
  }[];
};

export default function AdminMediaPage() {
  const { token } = useAuth();
  const [lib, setLib] = useState<Folder[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [folderId, setFolderId] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLib(await adminFetch<Folder[]>('/media/library', token));
  }, [token]);

  useEffect(() => {
    load().catch(() => setLib([]));
  }, [load]);

  const ensure = async () => {
    if (!token) return;
    await adminFetch('/media/folders/ensure-defaults', token, { method: 'POST' });
    await load();
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !file) return;
    const fd = new FormData();
    fd.append('file', file);
    const q = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
    const res = await fetch(`${getApiBase()}/media/upload${q}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) alert(await res.text());
    setFile(null);
    await load();
  };

  const pub = (key: string) => `${getApiBase()}/media/public/${encodeURIComponent(key)}`;

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">Media Library</h1>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={ensure}
          className="rounded border border-line bg-white px-3 py-1 text-sm hover:bg-panel"
        >
          Standaardmappen aanmaken
        </button>
      </div>
      <form onSubmit={upload} className="flex flex-wrap items-end gap-2 text-sm">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <input
          className="rounded border border-line px-2 py-1 font-mono text-xs"
          placeholder="folderId (uuid, optioneel)"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
        />
        <button type="submit" className="rounded bg-burgundy px-3 py-1 text-white hover:bg-burgundyDeep">
          Upload
        </button>
      </form>
      <div className="space-y-4">
        {lib.map((f) => (
          <div key={f.id} className="rounded-md border border-line bg-white p-3 text-sm shadow-sm">
            <p className="font-medium text-ink">
              {f.label} <span className="text-xs text-muted">{f.slug}</span>
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {f.assets.map((a) => (
                <li key={a.id}>
                  {a.originalName} —{' '}
                  <a href={pub(a.webpKey || a.storageKey)} className="text-burgundy hover:underline" target="_blank">
                    open
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
