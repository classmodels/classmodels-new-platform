'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type UserRow = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  modelSheet?: Record<string, unknown> | null;
  roles: { role: { slug: string; label: string } }[];
};

function beschikbaarLabel(ms: Record<string, unknown> | null | undefined): string {
  if (!ms || !Array.isArray(ms.beschikbaar)) return '—';
  const arr = ms.beschikbaar.filter((x): x is string => typeof x === 'string');
  return arr.length ? arr.join(', ') : '—';
}

export default function AdminModellenProfielenPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const load = useCallback(async () => {
    if (!token || !can('admin.users.read')) return;
    const data = await adminFetch<UserRow[]>('/admin/users', token);
    setRows(data.filter((u) => u.roles.some((r) => r.role.slug === 'model')));
  }, [token, can]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.email || '').localeCompare(b.email || '')),
    [rows],
  );

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.users.read')) {
    return <p className="text-sm text-muted">Geen toegang.</p>;
  }

  return (
    <div className="space-y-4 text-xs">
      <div>
        <h1 className="text-xl font-semibold text-ink">Modellenprofielen</h1>
        <p className="mt-1 text-[11px] text-muted">
          Overzicht van alle modellenaccounts. Alleen beheerders zien deze lijst; modellen zien enkel hun eigen
          gegevens in het modellenportaal.
        </p>
      </div>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="min-w-full text-left text-[11px]">
          <thead className="border-b-2 border-burgundy bg-zinc-100 text-[10px] font-bold uppercase tracking-wide text-burgundy">
            <tr>
              <th className="px-2 py-1.5">Naam</th>
              <th className="px-2 py-1.5">E-mail</th>
              <th className="px-2 py-1.5">GSM</th>
              <th className="px-2 py-1.5">Beschikbaar voor</th>
              <th className="px-2 py-1.5">Actie</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-2 py-1.5 font-medium text-ink">
                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-2 py-1.5 text-muted">{u.email}</td>
                <td className="px-2 py-1.5 text-muted">{u.phone || (u.modelSheet?.gsmModel as string) || '—'}</td>
                <td className="max-w-[220px] px-2 py-1.5 text-muted">{beschikbaarLabel(u.modelSheet)}</td>
                <td className="px-2 py-1.5">
                  {can('admin.users.write') ? (
                    <Link className="text-burgundy hover:underline" href={`/admin/gebruikers?edit=${u.id}`}>
                      Profiel bewerken
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!sorted.length ? <p className="text-[11px] text-muted">Geen modellen gevonden.</p> : null}
    </div>
  );
}
