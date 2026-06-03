'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import {
  historySubtitle,
  historyTitle,
  isModelPortalHistoryAction,
} from '@/lib/model-history-labels';

type Log = {
  id: string;
  action: string;
  createdAt: string;
  meta: unknown;
  user: { email: string; firstName?: string | null; lastName?: string | null } | null;
};

function userLabel(u: Log['user']) {
  if (!u) return '—';
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return n ? `${n} (${u.email})` : u.email;
}

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
      <div>
        <h1 className="text-xl font-semibold text-ink">Historiek / audit</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Technisch logboek van wat modellen (en soms beheerders) in het modellenportaal doen: profiel
          wijzigen, portfoliofoto&apos;s uploaden, afspraken maken, interesse op opdrachten, enz. Dit is niet
          hetzelfde als inlogstatistieken — die staan onder Statistieken.
        </p>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.length === 0 ? (
          <li className="text-muted">Nog geen gebeurtenissen.</li>
        ) : null}
        {rows.map((r) => {
          const when = new Date(r.createdAt).toLocaleString('nl-BE', {
            dateStyle: 'short',
            timeStyle: 'medium',
          });
          const portal = isModelPortalHistoryAction(r.action);
          const title = portal ? historyTitle(r.action, r.meta) : r.action;
          const sub = portal ? historySubtitle(r.action, r.meta) : '';
          return (
            <li key={r.id} className="rounded border border-line bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-xs text-muted">{when}</span>
                <span className="font-medium text-ink">{title}</span>
                <span className="text-xs text-muted">{userLabel(r.user)}</span>
              </div>
              {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
              {!portal && r.meta != null ? (
                <pre className="mt-1 max-h-24 overflow-auto rounded bg-panel p-2 text-[10px] text-muted">
                  {JSON.stringify(r.meta, null, 2)}
                </pre>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
