'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type ModelRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  setCardFreeOrder: boolean;
};

export default function AdminSetkaartPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<ModelRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !can('admin.users.read')) return;
    const data = await adminFetch<ModelRow[]>('/admin/set-card/free-order-models', token);
    setRows(Array.isArray(data) ? data : []);
  }, [token, can]);

  useEffect(() => {
    void load().catch(() => setRows([]));
  }, [load]);

  const toggle = async (userId: string, free: boolean) => {
    if (!token) return;
    setBusy(userId);
    setMsg(null);
    try {
      await adminFetch('/admin/set-card/free-order', token, {
        method: 'PATCH',
        body: JSON.stringify({ userId, free }),
      });
      setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, setCardFreeOrder: free } : r)));
      setMsg(free ? 'Gratis setkaart ingeschakeld.' : 'Gratis setkaart uitgeschakeld.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Opslaan mislukt.');
    } finally {
      setBusy(null);
    }
  };

  if (!can('admin.users.read')) {
    return <p className="text-sm text-muted">Geen toegang.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Setkaarten — gratis bestellen</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Vink modellen aan die hun setkaart <strong>gratis</strong> mogen bestellen (inbegrepen in de try-out
          modeshow). In Mollie zie je bij betalingen de naam en het e-mailadres van het model in de
          omschrijving.
        </p>
      </div>

      {msg ? <p className="text-sm text-ink">{msg}</p> : null}

      <div className="max-h-[70vh] overflow-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Gratis</th>
              <th className="px-3 py-2">Model</th>
              <th className="px-3 py-2">E-mail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const name = [r.firstName, r.lastName].filter(Boolean).join(' ') || '—';
              return (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={r.setCardFreeOrder}
                      disabled={busy === r.id}
                      onChange={(e) => void toggle(r.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-ink">{name}</td>
                  <td className="px-3 py-2 text-muted">{r.email}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? <p className="p-4 text-sm text-muted">Geen modellen gevonden.</p> : null}
      </div>
    </div>
  );
}
