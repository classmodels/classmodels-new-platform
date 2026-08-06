'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModelSheetDialog } from '@/components/admin/ModelSheetDialog';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type UserRow = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  modelSheet?: Record<string, unknown> | null;
  createdAt?: string;
  lastLoginAt?: string | null;
  roles: { role: { slug: string; label: string } }[];
};

function str(v: unknown): string {
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

function beschikbaarLabel(ms: Record<string, unknown> | null | undefined): string {
  if (!ms || !Array.isArray(ms.beschikbaar)) return '—';
  const arr = ms.beschikbaar.filter((x): x is string => typeof x === 'string');
  return arr.length ? arr.join(', ') : '—';
}

function geslachtLabel(ms: Record<string, unknown> | null | undefined): string {
  if (!ms || !Array.isArray(ms.geslacht)) return '—';
  const arr = ms.geslacht.filter((x): x is string => typeof x === 'string');
  return arr.length ? arr.join(', ') : '—';
}

function formatLastLogin(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('nl-BE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function formatCreated(d?: string): string {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('nl-BE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(d));
  } catch {
    return d;
  }
}

export function AdminModellenProfielenPageContent() {
  const { token, can } = useAuth();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [sheetUser, setSheetUser] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    if (!token || !can('admin.users.read')) return;
    const data = await adminFetch<UserRow[]>('/admin/users', token);
    setRows(data.filter((u) => u.roles.some((r) => r.role.slug === 'model')));
  }, [token, can]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  useEffect(() => {
    const id = searchParams.get('user')?.trim();
    if (!id || !rows.length) return;
    const hit = rows.find((u) => u.id === id);
    if (hit) setSheetUser(hit);
  }, [searchParams, rows]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ta = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const tb = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return (a.email || '').localeCompare(b.email || '');
    });
  }, [rows]);

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.users.read')) {
    return <p className="text-sm text-muted">Geen toegang.</p>;
  }

  return (
    <div className="space-y-4 text-xs">
      <div>
        <h1 className="text-xl font-semibold text-ink">Modellen</h1>
        <p className="mt-1 text-[11px] text-muted">
          Alle accounts met rol <strong className="text-ink">model</strong>, met gegevens uit de registratiefiche (
          <code className="text-[10px]">modelSheet</code>, gelijk aan het oude registratie-modellen-formulier). Klik op
          <strong className="text-ink"> Registratie</strong> voor het volledige overzicht per model.
        </p>
      </div>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="min-w-[920px] w-full text-left text-[11px]">
          <thead className="border-b-2 border-burgundy bg-zinc-100 text-[10px] font-bold uppercase tracking-wide text-burgundy">
            <tr>
              <th className="px-2 py-1.5">Naam</th>
              <th className="px-2 py-1.5">E-mail</th>
              <th className="px-2 py-1.5">GSM</th>
              <th className="px-2 py-1.5">Gemeente</th>
              <th className="px-2 py-1.5">Geb.</th>
              <th className="px-2 py-1.5">Lengte</th>
              <th className="px-2 py-1.5">Geslacht</th>
              <th className="min-w-[140px] px-2 py-1.5">Beschikbaar</th>
              <th className="whitespace-nowrap px-2 py-1.5">Laatst ingelogd</th>
              <th className="px-2 py-1.5 whitespace-nowrap">Aangemaakt</th>
              <th className="px-2 py-1.5">Acties</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const ms = u.modelSheet;
              return (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-2 py-1.5 font-medium text-ink">
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-muted">{u.email}</td>
                  <td className="px-2 py-1.5 text-muted">{u.phone || str(ms?.gsmModel) || '—'}</td>
                  <td className="px-2 py-1.5 text-muted">{str(ms?.gemeente) || '—'}</td>
                  <td className="px-2 py-1.5 text-muted whitespace-nowrap">{str(ms?.geboortedatum) || '—'}</td>
                  <td className="px-2 py-1.5 text-muted">{str(ms?.lengte) || '—'}</td>
                  <td className="px-2 py-1.5 text-muted">{geslachtLabel(ms ?? null)}</td>
                  <td className="max-w-[200px] px-2 py-1.5 text-muted">{beschikbaarLabel(ms ?? null)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-muted" title={u.lastLoginAt ?? undefined}>
                    {formatLastLogin(u.lastLoginAt)}
                  </td>
                  <td className="px-2 py-1.5 text-muted whitespace-nowrap">{formatCreated(u.createdAt)}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                      <button
                        type="button"
                        className="text-left text-burgundy hover:underline"
                        onClick={() => setSheetUser(u)}
                      >
                        Registratie
                      </button>
                      {can('admin.users.write') ? (
                        <Link className="text-burgundy hover:underline" href={`/admin/gebruikers?edit=${u.id}`}>
                          Bewerken
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!sorted.length ? <p className="text-[11px] text-muted">Geen modellen gevonden.</p> : null}

      {sheetUser ? (
        <ModelSheetDialog
          user={sheetUser}
          onClose={() => setSheetUser(null)}
          canEditUsers={can('admin.users.write')}
        />
      ) : null}
    </div>
  );
}

export default function AdminModellenProfielenPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Laden…</p>}>
      <AdminModellenProfielenPageContent />
    </Suspense>
  );
}
