'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  premiumUntil?: string | null;
  defaultPortal?: string | null;
  legacyWpUserId?: number | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  roles: { role: { slug: string; label: string } }[];
};

type RoleFilterKey = 'admin' | 'client' | 'modelAny' | 'newface' | 'tryout' | 'inactief';

const FILTER_STORAGE = 'cm-admin-gebruikers-filter-presets';

type SavedFilterPreset = { name: string; filters: RoleFilterKey[]; q: string };

type TimelineEntry = { id: string; at: string; text: string };

const MODEL_TIMELINE_ROLES = new Set(['model', 'newface', 'tryout', 'inactief']);

function hasModelTimelineRole(roleSlugs: string[]): boolean {
  return roleSlugs.some((s) => MODEL_TIMELINE_ROLES.has(s));
}

function parseTimelineFromSheet(ms: unknown): TimelineEntry[] {
  if (!ms || typeof ms !== 'object' || Array.isArray(ms)) return [];
  const t = (ms as Record<string, unknown>).adminTimeline;
  if (!Array.isArray(t)) return [];
  const out: TimelineEntry[] = [];
  for (const item of t) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : crypto.randomUUID();
    const at = typeof o.at === 'string' && o.at.length > 0 ? o.at : new Date().toISOString();
    const text = typeof o.text === 'string' ? o.text.trim() : '';
    if (!text) continue;
    out.push({ id, at, text });
  }
  return out;
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTimelineWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' });
}

function formatLastLogin(iso?: string | null): string {
  if (!iso) return '—';
  return formatTimelineWhen(iso);
}

function sortTimelineDesc(entries: TimelineEntry[]): TimelineEntry[] {
  return [...entries].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function gsmFromSheetObject(ms: Record<string, unknown> | null | undefined): string {
  if (!ms) return '';
  const g = ms.gsmModel;
  return typeof g === 'string' && g.trim() ? g.trim() : '';
}

function displayGsm(u: UserRow): string {
  const p = (u.phone ?? '').trim();
  if (p) return p;
  const ms = u.modelSheet;
  if (ms && typeof ms === 'object' && ms !== null && 'gsmModel' in ms) {
    const g = (ms as { gsmModel?: unknown }).gsmModel;
    if (typeof g === 'string' && g.trim()) return g.trim();
  }
  return '—';
}

function onlyDigits(x: string): string {
  return x.replace(/\D/g, '');
}

function userMatchesRoleFilters(u: UserRow, filters: Set<RoleFilterKey>): boolean {
  if (filters.size === 0) return true;
  const slugs = new Set(u.roles.map((r) => r.role.slug));
  for (const key of filters) {
    if (key === 'admin' && slugs.has('admin')) return true;
    if (key === 'client' && slugs.has('client')) return true;
    if (key === 'modelAny' && ['model', 'newface', 'tryout', 'inactief'].some((s) => slugs.has(s))) return true;
    if (key === 'newface' && slugs.has('newface')) return true;
    if (key === 'tryout' && slugs.has('tryout')) return true;
    if (key === 'inactief' && slugs.has('inactief')) return true;
  }
  return false;
}

function userMatchesSearch(u: UserRow, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  if (u.email.toLowerCase().includes(s)) return true;
  const local = u.email.split('@')[0]?.toLowerCase() ?? '';
  if (local.includes(s)) return true;
  if ((u.firstName ?? '').toLowerCase().includes(s)) return true;
  if ((u.lastName ?? '').toLowerCase().includes(s)) return true;
  const sd = onlyDigits(s);
  if (sd.length >= 3) {
    if (onlyDigits(u.phone ?? '').includes(sd)) return true;
    const ms = u.modelSheet?.gsmModel;
    if (typeof ms === 'string' && onlyDigits(ms).includes(sd)) return true;
  }
  const ms = u.modelSheet?.gsmModel;
  if (typeof ms === 'string' && ms.toLowerCase().includes(s)) return true;
  return false;
}

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
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [roleFilters, setRoleFilters] = useState<Set<RoleFilterKey>>(() => new Set());
  const [userSearch, setUserSearch] = useState('');
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>([]);
  const [editMeta, setEditMeta] = useState<{ createdAt: string | null; legacyWpUserId: number | null }>({
    createdAt: null,
    legacyWpUserId: null,
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
    premiumUntil: '',
  });
  const [editTimeline, setEditTimeline] = useState<TimelineEntry[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteAt, setNewNoteAt] = useState('');
  const [editSheetGsm, setEditSheetGsm] = useState('');

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
    try {
      const raw = localStorage.getItem(FILTER_STORAGE);
      if (raw) setSavedPresets(JSON.parse(raw) as SavedFilterPreset[]);
    } catch {
      /* ignore */
    }
  }, []);

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
      setEditMeta({
        createdAt: u.createdAt ?? null,
        legacyWpUserId: u.legacyWpUserId ?? null,
      });
      setEditId(id);
      const ms =
        u.modelSheet && typeof u.modelSheet === 'object' && !Array.isArray(u.modelSheet)
          ? (u.modelSheet as Record<string, unknown>)
          : null;
      setEditSheetGsm(gsmFromSheetObject(ms));
      setEditTimeline(parseTimelineFromSheet(u.modelSheet));
      setNewNoteText('');
      setNewNoteAt(toDatetimeLocalValue(new Date()));
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
        premiumUntil: u.premiumUntil ? u.premiumUntil.slice(0, 10) : '',
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
      companyName: edit.companyName || null,
      status: edit.status,
      defaultPortal: edit.defaultPortal || null,
      roleSlugs: edit.roleSlugs,
      isPremium: edit.isPremium,
      premiumUntil: edit.premiumUntil || null,
    };
    if (hasModelTimelineRole(edit.roleSlugs)) {
      body.modelSheet = {
        adminTimeline: editTimeline.map((x) => ({ id: x.id, at: x.at, text: x.text })),
      };
    } else {
      body.bio = edit.bio || null;
    }
    if (edit.password.length >= 8) body.password = edit.password;
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

  const gradeToSilver = async (u: UserRow) => {
    if (!can('admin.users.write')) return;
    const slugs = u.roles.map((r) => r.role.slug).filter((s) => s !== 'newface');
    if (!slugs.includes('model')) slugs.push('model');
    if (!window.confirm(`“${u.email}” graderen naar zilver (modelrol)?`)) return;
    await toggleQuick(u.id, { roleSlugs: slugs });
    setMsg('Rol bijgewerkt: model (zilver).');
  };

  const roleCounts = useMemo(() => {
    let admin = 0;
    let client = 0;
    let modelAny = 0;
    let newface = 0;
    let tryout = 0;
    let inactief = 0;
    for (const u of rows) {
      const s = new Set(u.roles.map((r) => r.role.slug));
      if (s.has('admin')) admin++;
      if (s.has('client')) client++;
      if (s.has('model') || s.has('newface') || s.has('tryout') || s.has('inactief')) modelAny++;
      if (s.has('newface')) newface++;
      if (s.has('tryout')) tryout++;
      if (s.has('inactief')) inactief++;
    }
    return {
      total: rows.length,
      admin,
      client,
      modelAny,
      newface,
      tryout,
      inactief,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const base = rows.filter((u) => userMatchesRoleFilters(u, roleFilters) && userMatchesSearch(u, userSearch));
    return [...base].sort((a, b) => {
      const ta = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const tb = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    });
  }, [rows, roleFilters, userSearch]);

  const sortedEditTimeline = useMemo(() => sortTimelineDesc(editTimeline), [editTimeline]);

  const appendTimelineNote = useCallback(() => {
    const text = newNoteText.trim();
    if (!text) {
      setMsg('Vul eerst een opmerking in.');
      return;
    }
    let atIso: string;
    if (newNoteAt.trim()) {
      const d = new Date(newNoteAt);
      atIso = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } else {
      atIso = new Date().toISOString();
    }
    setEditTimeline((prev) => [{ id: crypto.randomUUID(), at: atIso, text }, ...prev]);
    setNewNoteText('');
    setNewNoteAt(toDatetimeLocalValue(new Date()));
    setMsg('');
  }, [newNoteText, newNoteAt]);

  const toggleRoleFilter = (key: RoleFilterKey) => {
    setRoleFilters((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const saveCurrentPreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const entry: SavedFilterPreset = {
      name,
      filters: [...roleFilters],
      q: userSearch,
    };
    const next = [...savedPresets.filter((p) => p.name !== name), entry];
    setSavedPresets(next);
    localStorage.setItem(FILTER_STORAGE, JSON.stringify(next));
    setPresetName('');
    setMsg(`Filter "${name}" opgeslagen.`);
  };

  const applyPreset = (p: SavedFilterPreset) => {
    setRoleFilters(new Set(p.filters));
    setUserSearch(p.q);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleSelectAllFiltered = () => {
    const ids = filteredRows.map((r) => r.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const n = new Set(prev);
      if (allOn) {
        ids.forEach((id) => n.delete(id));
      } else {
        ids.forEach((id) => n.add(id));
      }
      return n;
    });
  };

  const deleteOne = async (id: string, email: string) => {
    if (!token || !can('admin.users.write')) return;
    const ok = window.confirm(
      `Gebruiker definitief verwijderen?\n\n${email}\n\nAlle bijbehorende gegevens en geüploade foto’s worden gewist. Dit kan niet ongedaan.`,
    );
    if (!ok) return;
    setMsg('');
    try {
      await adminFetch(`/admin/users/${id}`, token, { method: 'DELETE' });
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      if (editId === id) {
        setEditId(null);
        router.replace('/admin/gebruikers');
      }
      await load();
      setMsg('Gebruiker verwijderd.');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Verwijderen mislukt.');
    }
  };

  const deleteSelected = async () => {
    if (!token || !can('admin.users.write')) return;
    const ids = [...selected];
    if (!ids.length) return;
    const ok = window.confirm(
      `${ids.length} gebruiker(s) definitief verwijderen?\n\nAlle bijbehorende gegevens en geüploade foto’s worden gewist. Dit kan niet ongedaan.`,
    );
    if (!ok) return;
    setMsg('');
    try {
      const res = await adminFetch<{ deleted: string[]; errors: { id: string; message: string }[] }>(
        '/admin/users/delete-many',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ ids }),
        },
      );
      setSelected(new Set());
      await load();
      const errPart =
        res.errors?.length > 0
          ? ` (${res.errors.length} fout(en): ${res.errors.map((e) => e.message).join('; ')})`
          : '';
      setMsg(`${res.deleted?.length ?? 0} verwijderd.${errPart}`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Verwijderen mislukt.');
    }
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.users.read')) {
    return <p className="text-sm text-muted">Geen toegang tot gebruikers.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Gebruikers</h1>
        <p className="mt-1 text-sm text-muted">
          Filter met de vakjes (meerdere mogelijk = “én óf”). Zoek op naam, deel van e-mail (ook gebruikersnaam voor @),
          of gsm-nummers. Per rij: <strong className="text-ink">Premium</strong> zet je handmatig aan/uit; betaling via
          Mollie vult ook premium en vervaldatum.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded border border-line bg-panel px-2 py-1 text-muted">
            Totaal <strong className="text-ink">{roleCounts.total}</strong>
          </span>
          <label className="flex cursor-pointer items-center gap-1.5 rounded border border-line bg-panel px-2 py-1 text-muted hover:bg-white">
            <input
              type="checkbox"
              checked={roleFilters.has('admin')}
              onChange={() => toggleRoleFilter('admin')}
            />
            Admin <strong className="text-ink">{roleCounts.admin}</strong>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded border border-line bg-panel px-2 py-1 text-muted hover:bg-white">
            <input
              type="checkbox"
              checked={roleFilters.has('client')}
              onChange={() => toggleRoleFilter('client')}
            />
            Klant <strong className="text-ink">{roleCounts.client}</strong>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded border border-line bg-panel px-2 py-1 text-muted hover:bg-white">
            <input
              type="checkbox"
              checked={roleFilters.has('modelAny')}
              onChange={() => toggleRoleFilter('modelAny')}
            />
            Model (alle){' '}
            <strong className="text-ink">{roleCounts.modelAny}</strong>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded border border-line bg-panel px-2 py-1 text-muted hover:bg-white">
            <input
              type="checkbox"
              checked={roleFilters.has('newface')}
              onChange={() => toggleRoleFilter('newface')}
            />
            New face <strong className="text-ink">{roleCounts.newface}</strong>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded border border-line bg-panel px-2 py-1 text-muted hover:bg-white">
            <input
              type="checkbox"
              checked={roleFilters.has('tryout')}
              onChange={() => toggleRoleFilter('tryout')}
            />
            Try-out <strong className="text-ink">{roleCounts.tryout}</strong>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded border border-line bg-panel px-2 py-1 text-muted hover:bg-white">
            <input
              type="checkbox"
              checked={roleFilters.has('inactief')}
              onChange={() => toggleRoleFilter('inactief')}
            />
            Inactief <strong className="text-ink">{roleCounts.inactief}</strong>
          </label>
          {roleFilters.size > 0 ? (
            <button
              type="button"
              className="rounded border border-zinc-300 px-2 py-1 text-muted hover:bg-white"
              onClick={() => setRoleFilters(new Set())}
            >
              Filters wissen
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-[200px] flex-1 flex-col text-[11px] text-muted">
            Zoeken (naam, e-mail &gt; gebruikersnaam, gsm)
            <input
              className="mt-0.5 rounded border border-line px-2 py-1.5 text-sm text-ink"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="bv. jan, @telenet, 0475…"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <input
              className="rounded border border-line px-2 py-1.5 text-sm"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Naam voor deze filter-combinatie"
            />
            <button
              type="button"
              className="rounded bg-panel px-2 py-1.5 text-ink ring-1 ring-line hover:bg-white"
              onClick={saveCurrentPreset}
            >
              Filter opslaan
            </button>
            {savedPresets.length > 0 ? (
              <label className="flex items-center gap-1 text-muted">
                <span>Opgeslagen:</span>
                <select
                  className="rounded border border-line px-2 py-1 text-sm text-ink"
                  defaultValue=""
                  onChange={(e) => {
                    const p = savedPresets.find((x) => x.name === e.target.value);
                    if (p) applyPreset(p);
                    e.target.value = '';
                  }}
                >
                  <option value="">— kies —</option>
                  {savedPresets.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Getoond: <strong className="text-ink">{filteredRows.length}</strong> van {roleCounts.total}
        </p>
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

      {can('admin.users.write') && filteredRows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            className="rounded border border-line bg-white px-3 py-1.5 text-ink hover:bg-panel disabled:opacity-40"
            disabled={!selected.size}
            onClick={() => void deleteSelected()}
          >
            Geselecteerde verwijderen ({selected.size})
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-line bg-white shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-panel text-muted">
            <tr>
              {can('admin.users.write') ? (
                <th className="w-10 px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label="Alle zichtbare selecteren"
                    checked={
                      filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.id))
                    }
                    onChange={toggleSelectAllFiltered}
                  />
                </th>
              ) : null}
              <th className="px-3 py-2">Voornaam</th>
              <th className="px-3 py-2">Achternaam</th>
              <th className="px-3 py-2">E-mail</th>
              <th className="px-3 py-2">GSM</th>
              <th className="px-3 py-2">Rollen</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Premium</th>
              <th className="whitespace-nowrap px-3 py-2">Laatst ingelogd</th>
              <th className="px-3 py-2">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                {can('admin.users.write') ? (
                  <td className="px-2 py-2 align-middle">
                    <input
                      type="checkbox"
                      aria-label={`Selecteer ${u.email}`}
                      checked={selected.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                    />
                  </td>
                ) : null}
                <td className="max-w-[140px] truncate px-3 py-2 font-medium text-ink" title={(u.firstName ?? '').trim() || '—'}>
                  {(u.firstName ?? '').trim() || '—'}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-muted" title={(u.lastName ?? '').trim() || '—'}>
                  {(u.lastName ?? '').trim() || '—'}
                </td>
                <td className="max-w-[180px] truncate px-3 py-2 text-ink" title={u.email}>
                  {u.email}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-muted" title={displayGsm(u)}>
                  {displayGsm(u)}
                </td>
                <td className="px-3 py-2 text-muted">
                  {u.roles.map((r) => r.role.slug).join(', ')}
                </td>
                <td className="px-3 py-2 text-muted">{u.status}</td>
                <td className="px-3 py-2 text-muted">
                  {u.isPremium ? 'ja' : 'nee'}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted" title={u.lastLoginAt ?? undefined}>
                  {formatLastLogin(u.lastLoginAt)}
                </td>
                <td className="min-w-[200px] max-w-[260px] px-3 py-2 align-top">
                  <div className="flex flex-col items-stretch gap-1.5">
                    <button
                      type="button"
                      className="w-fit text-left text-burgundy hover:underline"
                      onClick={() => openEdit(u.id)}
                    >
                      Bewerken
                    </button>
                    {can('admin.users.write') ? (
                      <>
                        {u.roles.some((r) => r.role.slug === 'newface') ? (
                          <button
                            type="button"
                            className="w-full max-w-[11rem] rounded border border-zinc-400/70 bg-gradient-to-b from-zinc-100 to-zinc-300 px-2 py-1 text-left text-[10px] font-semibold leading-tight text-zinc-900 shadow-sm hover:from-white hover:to-zinc-200"
                            title="New face → model (zilver)"
                            onClick={() => void gradeToSilver(u)}
                          >
                            Graderen naar zilver
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="w-fit text-left text-burgundy hover:underline"
                          title="Zet premium aan of uit (handmatig of naast betaling)."
                          onClick={() => toggleQuick(u.id, { isPremium: !u.isPremium })}
                        >
                          Premium {u.isPremium ? 'uit' : 'aan'}
                        </button>
                        <button
                          type="button"
                          className="w-fit text-left text-red-700 hover:underline"
                          onClick={() => void deleteOne(u.id, u.email)}
                        >
                          Verwijderen
                        </button>
                      </>
                    ) : null}
                  </div>
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
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-white p-4 text-sm shadow-xl"
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
            <div className="mt-3 rounded border border-line bg-panel p-3 text-[11px] leading-relaxed text-muted">
              <p className="font-medium text-ink">Admin-overzicht</p>
              <p className="mt-1">
                <span className="text-muted">Account-ID:</span>{' '}
                <span className="font-mono text-ink">{editId}</span>
              </p>
              <p>
                <span className="text-muted">Aangemaakt:</span>{' '}
                {editMeta.createdAt ? new Date(editMeta.createdAt).toLocaleString('nl-BE') : '—'}
              </p>
              <p>
                <span className="text-muted">WordPress user-id (import):</span>{' '}
                {editMeta.legacyWpUserId != null ? String(editMeta.legacyWpUserId) : '—'}
              </p>
              <p>
                <span className="text-muted">GSM account:</span>{' '}
                {(edit.phone ?? '').trim() || '—'}
              </p>
              <p>
                <span className="text-muted">GSM modellenfiche (gsmModel):</span>{' '}
                {editSheetGsm || '—'}
              </p>
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
              {!hasModelTimelineRole(edit.roleSlugs) ? (
                <textarea
                  className="min-h-[72px] rounded border border-line px-2 py-1 sm:col-span-2"
                  placeholder="Bio of korte notitie"
                  value={edit.bio}
                  onChange={(e) => setEdit({ ...edit, bio: e.target.value })}
                />
              ) : (
                <div className="space-y-2 rounded border border-dashed border-burgundy/25 bg-white px-3 py-3 sm:col-span-2">
                  <p className="text-[11px] font-medium text-ink">Nieuwe opmerking</p>
                  <p className="text-[10px] text-muted">
                    bv. telefoongesprek of afspraak. Kies datum en uur (of klik <strong className="text-ink">Nu</strong>),
                    typ de tekst en zet de regel in de tijdlijn. Daarna <strong className="text-ink">Opslaan</strong>{' '}
                    onderaan om te bewaren.
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex min-w-[200px] flex-1 flex-col text-[10px] text-muted">
                      Datum en uur
                      <input
                        type="datetime-local"
                        className="mt-0.5 rounded border border-line px-2 py-1 text-ink"
                        value={newNoteAt}
                        onChange={(e) => setNewNoteAt(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="rounded border border-line bg-panel px-2 py-1.5 text-[11px] text-ink hover:bg-white"
                      onClick={() => setNewNoteAt(toDatetimeLocalValue(new Date()))}
                    >
                      Nu (dag en uur)
                    </button>
                  </div>
                  <textarea
                    className="min-h-[72px] w-full rounded border border-line px-2 py-1 text-xs"
                    placeholder="Opmerking…"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded bg-burgundy/90 px-2.5 py-1.5 text-[11px] text-white hover:bg-burgundyDeep"
                    onClick={appendTimelineNote}
                  >
                    Zet in tijdlijn
                  </button>
                </div>
              )}
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
              <label className="sm:col-span-2">
                <span className="text-[11px] font-medium text-ink">Premium geldig tot</span>
                <span className="mt-0.5 block text-[10px] text-muted">
                  Einddatum van het premiumabonnement (automatisch na geslaagde betaling). Dit is <strong>niet</strong>{' '}
                  hetzelfde als de tijd bij een opmerking — die zet je bij “Nieuwe opmerking”.
                </span>
                <input
                  type="date"
                  className="mt-1 w-full max-w-xs rounded border border-line px-2 py-1"
                  value={edit.premiumUntil}
                  onChange={(e) => setEdit({ ...edit, premiumUntil: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-0.5 text-xs sm:col-span-2">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={edit.isPremium}
                    onChange={(e) => setEdit({ ...edit, isPremium: e.target.checked })}
                    title="Premium voor websitefuncties: aan zolang dit aan staat (naast abonnement/premiumUntil)."
                  />
                  Premium
                </span>
                <span className="pl-6 text-[10px] text-muted leading-snug">
                  Aan = gebruiker krijgt premiumfuncties; uit = uit. Betaling via Mollie zet dit meestal automatisch.
                </span>
              </label>
              <input
                className="rounded border border-line px-2 py-1 sm:col-span-2"
                placeholder="Nieuw wachtwoord (optioneel, min. 8)"
                type="password"
                value={edit.password}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              />
            </div>
            {hasModelTimelineRole(edit.roleSlugs) ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-[11px] font-bold uppercase text-burgundy">Tijdlijn</p>
                <p className="mt-1 text-[10px] text-muted">
                  Chronologisch overzicht (nieuwste bovenaan). <strong className="text-ink">Wissen</strong> verwijdert
                  alleen de regel in dit scherm tot je opnieuw op <strong className="text-ink">Opslaan</strong> drukt.
                </p>
                {sortedEditTimeline.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">Nog geen opmerkingen in de tijdlijn.</p>
                ) : (
                  <ul className="mt-2 max-h-[min(50vh,320px)] space-y-3 overflow-y-auto rounded border border-line bg-panel/30 p-3">
                    {sortedEditTimeline.map((row) => (
                      <li key={row.id} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] font-semibold text-burgundy">{formatTimelineWhen(row.at)}</p>
                          <button
                            type="button"
                            className="shrink-0 text-[11px] text-red-700 hover:underline"
                            onClick={() => setEditTimeline((p) => p.filter((x) => x.id !== row.id))}
                          >
                            Wissen
                          </button>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-ink">{row.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
            <div className="mt-4 flex flex-wrap gap-2">
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
              {editId && can('admin.users.write') ? (
                <button
                  type="button"
                  className="ml-auto rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-800 hover:bg-red-100"
                  onClick={() => void deleteOne(editId, edit.email)}
                >
                  Gebruiker verwijderen…
                </button>
              ) : null}
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
