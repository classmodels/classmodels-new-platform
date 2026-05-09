'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Log = {
  id: string;
  action: string;
  createdAt: string;
  meta: unknown;
  user: { email: string } | null;
};

export default function AdminHistoriekPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Log[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setRows(await adminFetch<Log[]>('/admin/audit-logs?take=200', token));
  }, [token]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Historiek / audit</h1>
      <ul className="space-y-2 text-xs">
        {rows.map((r) => (
          <li key={r.id} className="rounded border border-line bg-white px-3 py-2 shadow-sm">
            <span className="text-muted">{new Date(r.createdAt).toLocaleString('nl-BE')}</span>{' '}
            <span className="font-medium text-ink">{r.action}</span>{' '}
            {r.user ? <span className="text-muted">({r.user.email})</span> : null}
            {r.meta != null ? (
              <pre className="mt-1 max-h-24 overflow-auto rounded bg-panel p-2 text-[10px] text-muted">
                {JSON.stringify(r.meta, null, 2)}
              </pre>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
