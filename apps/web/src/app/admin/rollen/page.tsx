'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { CATALOG_VISIBILITY_OPTS, isGroupingRoleSlug } from '@/lib/catalog-visibility';

type RoleRow = {
  id: string;
  slug: string;
  label: string;
  description?: string | null;
  permissions: unknown;
  catalogVisibility?: string;
  _count?: { users: number };
};

type UserLite = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: { role: { slug: string } }[];
};

export default function AdminRollenPage() {
  const { token, can } = useAuth();
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogGroup[]>([]);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [fullStar, setFullStar] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newVisibility, setNewVisibility] = useState('admin_frontend');
  const [creating, setCreating] = useState(false);
  const [vis, setVis] = useState<Record<string, string>>({});
  const [trashUsers, setTrashUsers] = useState<UserLite[]>([]);

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
    const vmap: Record<string, string> = {};
    for (const r of roleData) {
      vmap[r.id] = r.catalogVisibility || 'admin_frontend';
    }
    setVis(vmap);
    if (can('admin.users.read')) {
      try {
        const users = await adminFetch<UserLite[]>('/admin/users', token);
        setTrashUsers(users.filter((u) => u.roles.some((x) => x.role.slug === 'verwijderd')));
      } catch {
        setTrashUsers([]);
      }
    }
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
    const body: Record<string, unknown> = { permissions };
    if (vis[id]) body.catalogVisibility = vis[id];
    await adminFetch(`/admin/roles/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    await load();
    setMsg('Rol opgeslagen.');
  };

  const createGrouping = async () => {
    if (!token || !can('admin.roles.write')) return;
    const label = newLabel.trim();
    if (!label) {
      setMsg('Geef een naam voor de groepering, bv. High class.');
      return;
    }
    setMsg('');
    setCreating(true);
    try {
      await adminFetch('/admin/roles', token, {
        method: 'POST',
        body: JSON.stringify({
          label,
          slug: newSlug.trim() || undefined,
          catalogVisibility: newVisibility,
        }),
      });
      setNewLabel('');
      setNewSlug('');
      setNewVisibility('admin_frontend');
      await load();
      setMsg(`Groepering “${label}” aangemaakt. Zet modellen bij onder Gebruikers (aanvinken + bijzetten).`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Aanmaken mislukt.');
    } finally {
      setCreating(false);
    }
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
          Extra modelgroepen (naast Newface en Try-out) maak je hier; daarna zet je modellen in bulk bij
          onder <a className="text-burgundy underline" href="/admin/gebruikers">Gebruikers</a> — ze blijven
          ook in hun vorige groep.
        </p>
      </div>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}

      {can('admin.roles.write') ? (
        <form
          className="rounded-md border border-line bg-white p-4 text-sm shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void createGrouping();
          }}
        >
          <h2 className="font-medium text-ink">Nieuwe modelgroepering</h2>
          <p className="mt-1 text-xs text-muted">
            Bijvoorbeeld High class. Modellen krijgen deze rol extra; Newface of Try-out verdwijnt niet.
            Nieuwe groeperingen staan meteen als vinkje op de model-fiche (Beheer). Kies of die groepering
            alleen daar zichtbaar is, ook op de frontend voor bezoekers, of alleen op de frontend voor de admin.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[180px] flex-1 flex-col text-[11px] text-muted">
              Naam
              <input
                className="mt-0.5 rounded border border-line px-2 py-1.5 text-sm text-ink"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="High class"
              />
            </label>
            <label className="flex min-w-[160px] flex-1 flex-col text-[11px] text-muted">
              Slug (optioneel)
              <input
                className="mt-0.5 rounded border border-line px-2 py-1.5 text-sm text-ink"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="high-class"
              />
            </label>
            <label className="flex min-w-[220px] flex-1 flex-col text-[11px] text-muted">
              Zichtbaarheid
              <select
                className="mt-0.5 rounded border border-line px-2 py-1.5 text-sm text-ink"
                value={newVisibility}
                onChange={(e) => setNewVisibility(e.target.value)}
              >
                {CATALOG_VISIBILITY_OPTS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={creating}
              className="rounded bg-burgundy px-3 py-1.5 text-xs text-white hover:bg-burgundyDeep disabled:opacity-40"
            >
              Groepering aanmaken
            </button>
          </div>
        </form>
      ) : null}

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

            {r.slug === 'verwijderd' && can('admin.users.write') ? (
              <div className="mt-3 rounded border border-line bg-panel/30 p-3">
                <p className="text-xs text-muted">
                  Modellen die je verwijdert komen hier. Terugzetten herstelt het account; de map leegmaken wist
                  definitief.
                </p>
                {trashUsers.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {trashUsers.map((u) => {
                      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
                      return (
                        <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-ink">
                            {name} <span className="text-muted">({u.email})</span>
                          </span>
                          <button
                            type="button"
                            className="rounded border border-line bg-white px-2 py-0.5 text-ink hover:bg-white"
                            onClick={() => {
                              void adminFetch(`/admin/users/${u.id}/restore`, token!, { method: 'POST' })
                                .then(() => {
                                  setMsg(`${name} teruggezet.`);
                                  return load();
                                })
                                .catch((err: unknown) =>
                                  setMsg(err instanceof Error ? err.message : 'Terugzetten mislukt.'),
                                );
                            }}
                          >
                            Terugzetten
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted">Niemand in deze map.</p>
                )}
                {trashUsers.length ? (
                  <button
                    type="button"
                    className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-800 hover:bg-red-100"
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Map Verwijderd leegmaken?\n\n${trashUsers.length} account(s) definitief wissen, inclusief foto’s.`,
                        )
                      ) {
                        return;
                      }
                      void adminFetch<{ deleted: string[] }>('/admin/users/deleted/empty', token!, {
                        method: 'POST',
                      })
                        .then((res) => {
                          setMsg(`${res.deleted?.length ?? 0} definitief gewist.`);
                          return load();
                        })
                        .catch((err: unknown) =>
                          setMsg(err instanceof Error ? err.message : 'Leegmaken mislukt.'),
                        );
                    }}
                  >
                    Map leegmaken ({trashUsers.length})
                  </button>
                ) : null}
              </div>
            ) : null}

            {isGroupingRoleSlug(r.slug) && can('admin.roles.write') ? (
              <label className="mt-3 flex max-w-md flex-col text-[11px] text-muted">
                Zichtbaarheid op de site
                <select
                  className="mt-0.5 rounded border border-line px-2 py-1.5 text-sm text-ink"
                  value={vis[r.id] || 'admin_frontend'}
                  onChange={(e) => {
                    const v = e.target.value;
                    setVis((p) => ({ ...p, [r.id]: v }));
                    if (!token) return;
                    void adminFetch(`/admin/roles/${r.id}`, token, {
                      method: 'PATCH',
                      body: JSON.stringify({ catalogVisibility: v }),
                    })
                      .then(() => setMsg('Zichtbaarheid opgeslagen.'))
                      .catch((err: unknown) =>
                        setMsg(err instanceof Error ? err.message : 'Zichtbaarheid opslaan mislukt.'),
                      );
                  }}
                >
                  {CATALOG_VISIBILITY_OPTS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

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
