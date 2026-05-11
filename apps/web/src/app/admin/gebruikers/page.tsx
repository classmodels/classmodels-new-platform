'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';

type RoleOpt = { id: string; slug: string; label: string };

type UserRow = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  bio?: string | null;
  companyName?: string | null;
  modelSheet?: Record<string, unknown> | null;
  status: string;
  isPremium: boolean;
  premiumOverride: boolean;
  premiumUntil?: string | null;
  defaultPortal?: string | null;
  roles: { role: { slug: string; label: string } }[];
};

function AdminGebruikersPageContent() {
  const { token, can } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openedFromQuery = useRef(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roleOpts, setRoleOpts] = useState<RoleOpt[]>([]);
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: 'Demo123!',
    firstName: '',
    lastName: '',
    roleSlugs: 'guest',
  });
  const [edit, setEdit] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    companyName: '',
    status: 'active',
    defaultPortal: '' as '' | 'guest' | 'model' | 'client',
    roleSlugs: [] as string[],
    password: '',
    isPremium: false,
    premiumOverride: false,
    premiumUntil: '',
    modelSheetJson: '',
  });

  const load = useCallback(async () => {
    if (!token || !can('admin.users.read')) return;
    const [users, roles] = await Promise.all([
      adminFetch<UserRow[]>('/admin/users', token),
      can('admin.roles.read')
        ? adminFetch<RoleOpt[]>('/admin/roles', token)
        : Promise.resolve([] as RoleOpt[]),
    ]);
    setRows(users);
    setRoleOpts(roles);
  }, [token, can]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  useEffect(() => {
    if (!editId) openedFromQuery.current = false;
  }, [editId]);

  const openEdit = useCallback(
    async (id: string) => {
      if (!token) return;
      const [u, roles] = await Promise.all([
        adminFetch<UserRow & { modelSheet?: Record<string, unknown> | null }>(`/admin/users/${id}`, token),
        can('admin.roles.read')
          ? adminFetch<RoleOpt[]>('/admin/roles', token)
          : Promise.resolve(roleOpts),
      ]);
      if (roles.length && can('admin.roles.read')) setRoleOpts(roles);
      setEditId(id);
      setEdit({
        email: u.email,
        firstName: u.firstName ?? '',
        lastName: u.lastName ?? '',
        phone: u.phone ?? '',
        bio: u.bio ?? '',
        companyName: u.companyName ?? '',
        status: u.status,
        defaultPortal: (u.defaultPortal as '' | 'guest' | 'model' | 'client') ?? '',
        roleSlugs: u.roles.map((r) => r.role.slug),
        password: '',
        isPremium: u.isPremium,
        premiumOverride: u.premiumOverride,
        premiumUntil: u.premiumUntil ? u.premiumUntil.slice(0, 10) : '',
        modelSheetJson: JSON.stringify(u.modelSheet ?? {}, null, 2),
      });
    },
    [token, can, roleOpts],
  );

  useEffect(() => {
    const e = searchParams.get('edit');
    if (!e || openedFromQuery.current || !rows.length || !token) return;
    if (!rows.some((r) => r.id === e)) return;
    openedFromQuery.current = true;
    openEdit(e).catch(() => undefined);
  }, [searchParams, rows, token, openEdit]);

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editId || !can('admin.users.write')) return;
    setMsg('');
    const body: Record<string, unknown> = {
      email: edit.email,
      firstName: edit.firstName || null,
      lastName: edit.lastName || null,
      phone: edit.phone || null,
      bio: edit.bio || null,
      companyName: edit.companyName || null,
      status: edit.status,
      defaultPortal: edit.defaultPortal || null,
      roleSlugs: edit.roleSlugs,
      isPremium: edit.isPremium,
      premiumOverride: edit.premiumOverride,
      premiumUntil: edit.premiumUntil || null,
    };
    if (edit.password.length >= 8) body.password = edit.password;
    if (edit.roleSlugs.includes('model') && edit.modelSheetJson.trim()) {
      try {
        body.modelSheet = JSON.parse(edit.modelSheetJson) as Record<string, unknown>;
      } catch {
        setMsg('Modellenfiche (JSON) is ongeldig.');
        return;
      }
    }
    await adminFetch(`/admin/users/${editId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    setEditId(null);
    router.replace('/admin/gebruikers');
    await load();
    setMsg('Gebruiker bijgewerkt.');
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!token || !can('admin.users.write')) return;
    try {
      await adminFetch('/admin/users', token, {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          roleSlugs: form.roleSlugs.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      setForm({ ...form, email: '', firstName: '', lastName: '' });
      await load();
      setMsg('Gebruiker aangemaakt.');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Fout');
    }
  };

  const toggleQuick = async (id: string, patch: Record<string, unknown>) => {
    if (!token || !can('admin.users.write')) return;
    await adminFetch(`/admin/users/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    await load();
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.users.read')) {
    return <p className="text-sm text-muted">Geen toegang tot gebruikers.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Gebruikers</h1>
        <p className="mt-1 text-sm text-muted">Aanmaken, rollen, profiel- en premiumvelden.</p>
      </div>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}

      {can('admin.users.write') ? (
        <form onSubmit={create} className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
          <p className="font-medium text-ink">Nieuwe gebruiker</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="rounded border border-line px-2 py-1"
              placeholder="e-mail"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="rounded border border-line px-2 py-1"
              placeholder="wachtwoord"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <input
              className="rounded border border-line px-2 py-1"
              placeholder="voornaam"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <input
              className="rounded border border-line px-2 py-1"
              placeholder="achternaam"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
            <input
              className="rounded border border-line px-2 py-1 sm:col-span-2"
              placeholder="rollen (komma): model, client, admin"
              value={form.roleSlugs}
              onChange={(e) => setForm({ ...form, roleSlugs: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="mt-3 rounded bg-burgundy px-3 py-1.5 text-white hover:bg-burgundyDeep"
          >
            Aanmaken
          </button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-line bg-white shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="px-3 py-2">E-mail</th>
              <th className="px-3 py-2">Rollen</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Premium</th>
              <th className="px-3 py-2">Acties</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-3 py-2 text-ink">{u.email}</td>
                <td className="px-3 py-2 text-muted">
                  {u.roles.map((r) => r.role.slug).join(', ')}
                </td>
                <td className="px-3 py-2 text-muted">{u.status}</td>
                <td className="px-3 py-2 text-muted">
                  {u.isPremium ? 'ja' : 'nee'}
                  {u.premiumOverride ? ' (override)' : ''}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="mr-2 text-burgundy hover:underline"
                    onClick={() => openEdit(u.id)}
                  >
                    Bewerken
                  </button>
                  {can('admin.users.write') ? (
                    <>
                      <button
                        type="button"
                        className="mr-2 text-burgundy hover:underline"
                        onClick={() => toggleQuick(u.id, { isPremium: !u.isPremium })}
                      >
                        toggle premium
                      </button>
                      <button
                        type="button"
                        className="text-burgundy hover:underline"
                        onClick={() => toggleQuick(u.id, { premiumOverride: !u.premiumOverride })}
                      >
                        toggle override
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            onSubmit={saveEdit}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-white p-4 text-sm shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium text-ink">Gebruiker bewerken</h2>
              <button
                type="button"
                className="text-muted hover:text-ink"
                onClick={() => {
                  setEditId(null);
                  router.replace('/admin/gebruikers');
                }}
              >
                ✕
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-[11px] text-muted">E-mail</span>
                <input
                  className="mt-0.5 w-full rounded border border-line px-2 py-1"
                  value={edit.email}
                  onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                  required
                />
              </label>
              <input
                className="rounded border border-line px-2 py-1"
                placeholder="Voornaam"
                value={edit.firstName}
                onChange={(e) => setEdit({ ...edit, firstName: e.target.value })}
              />
              <input
                className="rounded border border-line px-2 py-1"
                placeholder="Achternaam"
                value={edit.lastName}
                onChange={(e) => setEdit({ ...edit, lastName: e.target.value })}
              />
              <input
                className="rounded border border-line px-2 py-1"
                placeholder="Telefoon"
                value={edit.phone}
                onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
              />
              <input
                className="rounded border border-line px-2 py-1"
                placeholder="Bedrijfsnaam"
                value={edit.companyName}
                onChange={(e) => setEdit({ ...edit, companyName: e.target.value })}
              />
              <textarea
                className="min-h-[72px] rounded border border-line px-2 py-1 sm:col-span-2"
                placeholder="Bio"
                value={edit.bio}
                onChange={(e) => setEdit({ ...edit, bio: e.target.value })}
              />
              <select
                className="rounded border border-line px-2 py-1"
                value={edit.status}
                onChange={(e) => setEdit({ ...edit, status: e.target.value })}
              >
                <option value="active">active</option>
                <option value="suspended">suspended</option>
                <option value="pending">pending</option>
              </select>
              <select
                className="rounded border border-line px-2 py-1"
                value={edit.defaultPortal}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    defaultPortal: e.target.value as typeof edit.defaultPortal,
                  })
                }
              >
                <option value="">default portaal</option>
                <option value="guest">guest</option>
                <option value="model">model</option>
                <option value="client">client</option>
              </select>
              <input
                type="date"
                className="rounded border border-line px-2 py-1 sm:col-span-2"
                value={edit.premiumUntil}
                onChange={(e) => setEdit({ ...edit, premiumUntil: e.target.value })}
              />
              <label className="flex items-center gap-2 text-xs sm:col-span-1">
                <input
                  type="checkbox"
                  checked={edit.isPremium}
                  onChange={(e) => setEdit({ ...edit, isPremium: e.target.checked })}
                />
                Premium
              </label>
              <label className="flex items-center gap-2 text-xs sm:col-span-1">
                <input
                  type="checkbox"
                  checked={edit.premiumOverride}
                  onChange={(e) => setEdit({ ...edit, premiumOverride: e.target.checked })}
                />
                Premium override
              </label>
              <input
                className="rounded border border-line px-2 py-1 sm:col-span-2"
                placeholder="Nieuw wachtwoord (optioneel, min. 8)"
                type="password"
                value={edit.password}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              />
            </div>
            {edit.roleSlugs.includes('model') ? (
              <label className="sm:col-span-2">
                <span className="text-[11px] font-bold uppercase text-burgundy">Modellenfiche (JSON)</span>
                <textarea
                  className="mt-1 min-h-[140px] w-full border border-line px-2 py-1 font-mono text-[11px]"
                  value={edit.modelSheetJson}
                  onChange={(e) => setEdit({ ...edit, modelSheetJson: e.target.value })}
                  spellCheck={false}
                />
                <span className="mt-0.5 block text-[10px] text-muted">
                  Velden zoals beschikbaar, lengte, … — merge met bestaande data op de server.
                </span>
              </label>
            ) : null}
            <p className="mt-3 text-[11px] font-medium text-ink">Rollen</p>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              {roleOpts.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={edit.roleSlugs.includes(r.slug)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEdit({ ...edit, roleSlugs: [...edit.roleSlugs, r.slug] });
                      } else {
                        setEdit({
                          ...edit,
                          roleSlugs: edit.roleSlugs.filter((s) => s !== r.slug),
                        });
                      }
                    }}
                  />
                  {r.label} ({r.slug})
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded bg-burgundy px-3 py-1.5 text-white hover:bg-burgundyDeep"
              >
                Opslaan
              </button>
              <button
                type="button"
                className="text-xs text-muted hover:text-ink"
                onClick={() => {
                  setEditId(null);
                  router.replace('/admin/gebruikers');
                }}
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminGebruikersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Laden…</p>}>
      <AdminGebruikersPageContent />
    </Suspense>
  );
}
