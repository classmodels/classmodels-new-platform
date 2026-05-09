'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type RoleRow = {
  id: string;
  slug: string;
  label: string;
  description?: string | null;
  permissions: unknown;
  _count?: { users: number };
};

type CatalogGroup = {
  id: string;
  label: string;
  items: { id: string; label: string }[];
};

export default function AdminRollenPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogGroup[]>([]);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [fullStar, setFullStar] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!token || !can('admin.roles.read')) return;
    const [roleData, cat] = await Promise.all([
      adminFetch<RoleRow[]>('/admin/roles', token),
      adminFetch<CatalogGroup[]>('/admin/roles/permission-catalog', token),
    ]);
    setRows(roleData);
    setCatalog(cat);
    const sel: Record<string, Set<string>> = {};
    const fs: Record<string, boolean> = {};
    for (const r of roleData) {
      const p = r.permissions;
      if (Array.isArray(p) && p.includes('*')) {
        fs[r.id] = true;
        sel[r.id] = new Set();
      } else if (Array.isArray(p)) {
        fs[r.id] = false;
        sel[r.id] = new Set(p.filter((x): x is string => typeof x === 'string' && x !== '*'));
      } else {
        fs[r.id] = false;
        sel[r.id] = new Set();
      }
    }
    setSelected(sel);
    setFullStar(fs);
  }, [token, can]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const togglePerm = (roleId: string, permId: string) => {
    if (fullStar[roleId]) return;
    setSelected((prev) => {
      const next = { ...prev };
      const s = new Set(next[roleId] ?? []);
      if (s.has(permId)) s.delete(permId);
      else s.add(permId);
      next[roleId] = s;
      return next;
    });
  };

  const save = async (id: string) => {
    if (!token || !can('admin.roles.write')) return;
    setMsg('');
    const permissions = fullStar[id] ? ['*'] : [...(selected[id] ?? [])];
    await adminFetch(`/admin/roles/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
    await load();
    setMsg('Rol opgeslagen.');
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.roles.read')) {
    return <p className="text-sm text-muted">Geen toegang tot rollen.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Rollen & permissies</h1>
        <p className="mt-1 text-sm text-muted">
          Rechten zijn fijnkorrelig en worden bij elk API-verzoek opnieuw uit de database geladen.
        </p>
      </div>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}

      <ul className="space-y-6">
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="font-medium text-ink">{r.label}</span>{' '}
                <span className="text-xs text-muted">({r.slug})</span>
              </div>
              {r._count != null ? (
                <span className="text-xs text-muted">{r._count.users} gebruikers</span>
              ) : null}
            </div>
            {r.description ? <p className="mt-1 text-xs text-muted">{r.description}</p> : null}

            {can('admin.roles.write') ? (
              <label className="mt-3 flex items-center gap-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={!!fullStar[r.id]}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setFullStar((f) => ({ ...f, [r.id]: on }));
                  }}
                />
                Volledige toegang (<code className="text-[10px]">*</code>)
              </label>
            ) : null}

            <div className="mt-3 space-y-3 opacity-100 disabled:opacity-50">
              {catalog.map((g) => (
                <fieldset
                  key={g.id}
                  disabled={!!fullStar[r.id] || !can('admin.roles.write')}
                  className="rounded border border-line bg-panel/20 p-2"
                >
                  <legend className="px-1 text-xs font-medium text-ink">{g.label}</legend>
                  <div className="mt-2 grid gap-1 sm:grid-cols-2">
                    {g.items.map((it) => (
                      <label key={it.id} className="flex cursor-pointer items-start gap-2 text-[11px]">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={!!selected[r.id]?.has(it.id)}
                          disabled={!!fullStar[r.id]}
                          onChange={() => togglePerm(r.id, it.id)}
                        />
                        <span>
                          <span className="text-ink">{it.label}</span>
                          <code className="ml-1 text-[10px] text-muted">{it.id}</code>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            {can('admin.roles.write') ? (
              <button
                type="button"
                onClick={() => save(r.id)}
                className="mt-3 rounded bg-burgundy px-3 py-1 text-xs text-white hover:bg-burgundyDeep"
              >
                Opslaan
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
