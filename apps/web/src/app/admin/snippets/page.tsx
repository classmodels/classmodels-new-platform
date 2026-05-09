'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Snip = { id: string; slug: string; version: string; enabled: boolean };

export default function AdminSnippetsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Snip[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setRows(await adminFetch<Snip[]>('/admin/snippets', token));
  }, [token]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Snippets / plugins</h1>
      <p className="text-sm text-muted">
        Metadata in database; sandboxed uitvoering volgt. Upload/activatie via toekomstige module.
      </p>
      <ul className="text-sm text-muted">
        {rows.length === 0 ? <li>Geen snippets.</li> : null}
        {rows.map((r) => (
          <li key={r.id}>
            {r.slug} v{r.version} {r.enabled ? '(actief)' : '(uit)'}
          </li>
        ))}
      </ul>
    </div>
  );
}
