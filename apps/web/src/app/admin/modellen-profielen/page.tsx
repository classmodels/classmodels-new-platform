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
  createdAt?: string;
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

const MODEL_SHEET_LABELS: Record<string, string> = {
  geboortedatum: 'Geboortedatum',
  nationaliteit: 'Nationaliteit',
  straat: 'Straat',
  postcode: 'Postcode',
  gemeente: 'Gemeente',
  land: 'Land',
  gsmModel: 'GSM (model)',
  gsmMoeder: 'GSM moeder',
  gsmVader: 'GSM vader',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  rekeningnummer: 'Rekeningnummer',
  lengte: 'Lengte (cm)',
  maat: 'Maat',
  schoenmaat: 'Schoenmaat',
  haarkleur: 'Haarkleur',
  kleurOgen: 'Kleur ogen',
  bhMaat: 'BH-maat',
  borstomtrek: 'Borstomtrek',
  confectiemaat: 'Confectiemaat',
  heupomtrek: 'Heupomtrek',
  jeansmaat: 'Jeansmaat',
  taille: 'Taille',
  overMij: 'Over mij',
  ervaringen: 'Ervaringen',
  geslacht: 'Geslacht',
  beschikbaar: 'Beschikbaar voor',
};

function formatModelSheetRows(ms: Record<string, unknown> | null | undefined): { key: string; label: string; value: string }[] {
  if (!ms || typeof ms !== 'object') return [];
  const keys = Object.keys(ms).sort((a, b) => {
    const la = MODEL_SHEET_LABELS[a] ?? a;
    const lb = MODEL_SHEET_LABELS[b] ?? b;
    return la.localeCompare(lb, 'nl');
  });
  const out: { key: string; label: string; value: string }[] = [];
  for (const key of keys) {
    const raw = ms[key];
    let value = '—';
    if (Array.isArray(raw)) {
      value = raw.filter((x) => typeof x === 'string').join(', ') || '—';
    } else if (raw != null && typeof raw === 'object') {
      value = JSON.stringify(raw);
    } else if (raw != null) {
      value = String(raw);
    }
    out.push({
      key,
      label: MODEL_SHEET_LABELS[key] ?? key,
      value: value.length > 2000 ? `${value.slice(0, 2000)}…` : value,
    });
  }
  return out;
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

export default function AdminModellenProfielenPage() {
  const { token, can } = useAuth();
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          onClick={() => setSheetUser(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sheet-title" className="text-sm font-semibold text-ink">
              Registratie — {[sheetUser.firstName, sheetUser.lastName].filter(Boolean).join(' ') || sheetUser.email}
            </h2>
            <p className="mt-0.5 text-[10px] text-muted">{sheetUser.email}</p>
            <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[11px]">
              {formatModelSheetRows(sheetUser.modelSheet ?? null).length === 0 ? (
                <p className="text-muted">Nog geen registratiegegevens (modelSheet leeg).</p>
              ) : (
                formatModelSheetRows(sheetUser.modelSheet ?? null).map((row) => (
                  <div key={row.key} className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-3">
                    <dt className="font-semibold text-muted">{row.label}</dt>
                    <dd className="break-words text-ink">{row.value}</dd>
                  </div>
                ))
              )}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
              {can('admin.users.write') ? (
                <Link
                  className="rounded bg-burgundy px-3 py-1.5 text-[11px] text-white hover:bg-burgundyDeep"
                  href={`/admin/gebruikers?edit=${sheetUser.id}`}
                >
                  Open in Gebruikers
                </Link>
              ) : null}
              <button
                type="button"
                className="ml-auto text-[11px] text-muted hover:text-ink"
                onClick={() => setSheetUser(null)}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
