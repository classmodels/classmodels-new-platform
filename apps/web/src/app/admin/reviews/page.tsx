'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type Rev = {
  id: string;
  title: string;
  body: string;
  approved: boolean;
  visible: boolean;
  sortOrder: number;
};

export default function AdminReviewsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Rev[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setRows(await adminFetch<Rev[]>('/admin/reviews', token));
  }, [token]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const patch = async (id: string, body: Partial<Rev>) => {
    if (!token) return;
    await adminFetch(`/admin/reviews/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    await load();
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">Reviews</h1>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border border-line bg-white p-3 text-sm shadow-sm">
            <p className="font-medium text-ink">{r.title}</p>
            <p className="mt-1 text-xs text-muted line-clamp-2">{r.body}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 hover:bg-panel"
                onClick={() => patch(r.id, { approved: !r.approved })}
              >
                {r.approved ? 'Afkeuren' : 'Goedkeuren'}
              </button>
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 hover:bg-panel"
                onClick={() => patch(r.id, { visible: !r.visible })}
              >
                {r.visible ? 'Verbergen' : 'Tonen'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
