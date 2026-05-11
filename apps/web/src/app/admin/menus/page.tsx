'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { apiFetch } from '@/lib/api';

type ContentRow = { key: string; value: string; locale: string };

/** Hoofd-sleutels `container.slug` waarvan de waarde geldige container-JSON is. */
function parseContainerSlugs(rows: ContentRow[]): string[] {
  const slugs = new Set<string>();
  for (const r of rows) {
    const m = /^container\.([^.]+)$/.exec(r.key);
    if (!m) continue;
    try {
      const j = JSON.parse(r.value) as { type?: string; columns?: unknown };
      if (j?.type === 'container' && Array.isArray(j.columns)) slugs.add(m[1]);
    } catch {
      /* geen container-JSON */
    }
  }
  return [...slugs].sort((a, b) => a.localeCompare(b, 'nl'));
}

function mergeItemFormWithContainerHref(raw: string, slug: string): string {
  const href = `/content/${slug}`;
  const p = raw.split('|').map((s) => s.trim());
  const label = p[0] || slug;
  const sortOrder = p[2] !== '' && p[2] != null ? p[2] : '0';
  const roles = p[3] ?? '';
  if (roles) return `${label} | ${href} | ${sortOrder} | ${roles}`;
  return `${label} | ${href} | ${sortOrder}`;
}

type Item = {
  id: string;
  label: string;
  href: string;
  sortOrder: number;
  visibleWeb: boolean;
  visibleApp: boolean;
  requiresPremium: boolean;
  roleSlugs: unknown;
};

type MenuRow = {
  id: string;
  slug: string;
  label: string;
  portal: string;
  placement: string;
  items: Item[];
};

const portals = ['guest', 'model', 'client'] as const;

export default function AdminMenusPage() {
  const { token, can } = useAuth();
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [newMenu, setNewMenu] = useState({
    slug: '',
    label: '',
    portal: 'guest' as (typeof portals)[number],
    placement: 'top',
  });
  const [itemForms, setItemForms] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [containerSlugs, setContainerSlugs] = useState<string[]>([]);

  const loadContainerSlugs = useCallback(async () => {
    try {
      const rows = await apiFetch<ContentRow[]>('/content/strings');
      setContainerSlugs(parseContainerSlugs(rows));
    } catch {
      setContainerSlugs([]);
    }
  }, []);

  useEffect(() => {
    void loadContainerSlugs();
  }, [loadContainerSlugs]);

  const load = useCallback(async () => {
    if (!token || !can('admin.menus.read')) return;
    const data = await adminFetch<MenuRow[]>('/admin/menus', token);
    setMenus(data);
  }, [token, can]);

  useEffect(() => {
    load().catch(() => setMenus([]));
  }, [load]);

  const saveMenu = async (m: MenuRow, patch: Partial<Pick<MenuRow, 'label' | 'placement' | 'portal'>>) => {
    if (!token || !can('admin.menus.write')) return;
    setMsg('');
    await adminFetch(`/admin/menus/${m.id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    await load();
    setMsg('Menu bijgewerkt.');
  };

  const removeMenu = async (id: string) => {
    if (!token || !can('admin.menus.write') || !confirm('Menu verwijderen?')) return;
    await adminFetch(`/admin/menus/${id}`, token, { method: 'DELETE' });
    await load();
    setMsg('Menu verwijderd.');
  };

  const createMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !can('admin.menus.write')) return;
    setMsg('');
    await adminFetch('/admin/menus', token, {
      method: 'POST',
      body: JSON.stringify(newMenu),
    });
    setNewMenu({ slug: '', label: '', portal: 'guest', placement: 'top' });
    await load();
    setMsg('Menu aangemaakt.');
  };

  const addItem = async (menuId: string) => {
    const raw = itemForms[menuId] ?? '';
    const parts = raw.split('|').map((s) => s.trim());
    const label = parts[0] ?? '';
    const href = parts[1] ?? '/';
    const sortOrder = parseInt(parts[2] ?? '0', 10) || 0;
    const roleSlugs = (parts[3] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!label || !token || !can('admin.menus.write')) return;
    await adminFetch(`/admin/menus/${menuId}/items`, token, {
      method: 'POST',
      body: JSON.stringify({ label, href, sortOrder, roleSlugs }),
    });
    setItemForms((f) => ({ ...f, [menuId]: '' }));
    await load();
    await loadContainerSlugs();
    setMsg('Item toegevoegd.');
  };

  const patchItem = async (item: Item, patch: Partial<Item>) => {
    if (!token || !can('admin.menus.write')) return;
    const body: Record<string, unknown> = {};
    if (patch.label != null) body.label = patch.label;
    if (patch.href != null) body.href = patch.href;
    if (patch.sortOrder != null) body.sortOrder = patch.sortOrder;
    if (patch.visibleWeb != null) body.visibleWeb = patch.visibleWeb;
    if (patch.requiresPremium != null) body.requiresPremium = patch.requiresPremium;
    if (patch.roleSlugs != null) body.roleSlugs = patch.roleSlugs;
    await adminFetch(`/admin/menus/items/${item.id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    await load();
    setMsg('Item opgeslagen.');
  };

  const deleteItem = async (itemId: string) => {
    if (!token || !can('admin.menus.write') || !confirm('Item verwijderen?')) return;
    await adminFetch(`/admin/menus/items/${itemId}`, token, { method: 'DELETE' });
    await load();
    setMsg('Item verwijderd.');
  };

  if (!token) return <p className="text-sm text-muted">Inloggen vereist.</p>;
  if (!can('admin.menus.read')) {
    return <p className="text-sm text-muted">Geen toegang tot menu&apos;s.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Menu&apos;s</h1>
        <p className="mt-1 text-sm text-muted">
          Beheer navigatie per portaal. Items: optioneel rolfilter als komma-gescheiden slugs (model, client,
          admin).
        </p>
        <p className="mt-2 text-xs text-muted">
          Containerpagina&apos;s (Admin → Content, container opslaan) verschijnen hieronder als keuzelijst; je hoeft
          de link <code>/content/…</code> niet meer te typen.
        </p>
        <p className="mt-1 text-xs text-muted">
          <strong>Gastenportaal:</strong> het vaste zijmenu blijft zoals het is. Onderaan komen alleen links die naar een
          <strong> container</strong> gaan: <code>/content/jouw-slug</code> of <code>/portal/guest?content=jouw-slug</code>.
          Andere links (home, FAQ, …) in een menu met placement <code>left</code> worden in het gastenportaal <strong>niet</strong> meer in de zijbalk getoond — gebruik daarvoor het vaste menu of placement <code>top</code>. Dubbele container-links op dezelfde URL worden samengevoegd.
        </p>
      </div>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}

      {can('admin.menus.write') ? (
        <form
          onSubmit={createMenu}
          className="rounded-md border border-line bg-white p-4 text-sm shadow-sm"
        >
          <p className="font-medium text-ink">Nieuw menu</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              className="rounded border border-line px-2 py-1"
              placeholder="slug (uniek)"
              value={newMenu.slug}
              onChange={(e) => setNewMenu({ ...newMenu, slug: e.target.value })}
              required
            />
            <input
              className="rounded border border-line px-2 py-1"
              placeholder="label"
              value={newMenu.label}
              onChange={(e) => setNewMenu({ ...newMenu, label: e.target.value })}
              required
            />
            <select
              className="rounded border border-line px-2 py-1"
              value={newMenu.portal}
              onChange={(e) =>
                setNewMenu({ ...newMenu, portal: e.target.value as (typeof portals)[number] })
              }
            >
              {portals.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              className="rounded border border-line px-2 py-1"
              placeholder="placement (top)"
              value={newMenu.placement}
              onChange={(e) => setNewMenu({ ...newMenu, placement: e.target.value })}
            />
            <button type="submit" className="rounded bg-burgundy px-3 py-1 text-white hover:bg-burgundyDeep">
              Aanmaken
            </button>
          </div>
        </form>
      ) : null}

      <ul className="space-y-6">
        {menus.map((m) => (
          <li key={m.id} className="rounded-md border border-line bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-muted">
                Label
                <input
                  className="mt-0.5 block rounded border border-line px-2 py-1 text-ink"
                  defaultValue={m.label}
                  onBlur={(e) => {
                    if (e.target.value !== m.label) saveMenu(m, { label: e.target.value });
                  }}
                />
              </label>
              <label className="text-xs text-muted">
                Placement
                <input
                  className="mt-0.5 block rounded border border-line px-2 py-1"
                  defaultValue={m.placement}
                  onBlur={(e) => {
                    if (e.target.value !== m.placement) saveMenu(m, { placement: e.target.value });
                  }}
                />
              </label>
              <label className="text-xs text-muted">
                Portaal
                <select
                  className="mt-0.5 block rounded border border-line px-2 py-1"
                  defaultValue={m.portal}
                  onChange={(e) =>
                    saveMenu(m, { portal: e.target.value as (typeof portals)[number] })
                  }
                >
                  {portals.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-xs text-muted">
                {m.slug} · <code>{m.id.slice(0, 8)}…</code>
              </span>
              {can('admin.menus.write') ? (
                <button
                  type="button"
                  className="ml-auto text-xs text-red-700 hover:underline"
                  onClick={() => removeMenu(m.id)}
                >
                  Verwijder menu
                </button>
              ) : null}
            </div>

            <p className="mt-3 text-xs font-medium text-ink">Items</p>
            <ol className="mt-2 space-y-3 border-t border-line pt-2">
              {m.items.map((it) => {
                const rs = Array.isArray(it.roleSlugs)
                  ? (it.roleSlugs as string[]).join(', ')
                  : '';
                return (
                  <li key={it.id} className="grid gap-2 rounded border border-line bg-panel/30 p-2 md:grid-cols-6">
                    <input
                      className="rounded border border-line px-1 py-0.5 text-xs md:col-span-2"
                      defaultValue={it.label}
                      onBlur={(e) => {
                        if (e.target.value !== it.label) patchItem(it, { label: e.target.value });
                      }}
                    />
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <input
                        className="rounded border border-line px-1 py-0.5 text-xs"
                        defaultValue={it.href}
                        key={`href-${it.id}-${it.href}`}
                        onBlur={(e) => {
                          if (e.target.value !== it.href) patchItem(it, { href: e.target.value });
                        }}
                      />
                      {containerSlugs.length ? (
                        <select
                          className="rounded border border-line px-1 py-0.5 text-[11px] text-muted"
                          defaultValue=""
                          onChange={(e) => {
                            const slug = e.target.value;
                            if (!slug) return;
                            void patchItem(it, { href: `/content/${slug}` });
                            e.target.value = '';
                          }}
                        >
                          <option value="">Kies container als link…</option>
                          {containerSlugs.map((s) => (
                            <option key={s} value={s}>
                              {s} → /content/{s}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                    <input
                      type="number"
                      className="rounded border border-line px-1 py-0.5 text-xs"
                      defaultValue={it.sortOrder}
                      onBlur={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (n !== it.sortOrder) patchItem(it, { sortOrder: n });
                      }}
                    />
                    <label className="flex items-center gap-1 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        defaultChecked={it.visibleWeb}
                        onChange={(e) => patchItem(it, { visibleWeb: e.target.checked })}
                      />
                      web
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        defaultChecked={it.requiresPremium}
                        onChange={(e) => patchItem(it, { requiresPremium: e.target.checked })}
                      />
                      premium
                    </label>
                    <input
                      className="rounded border border-line px-1 py-0.5 text-xs md:col-span-3"
                      placeholder="rollen: model, admin"
                      defaultValue={rs}
                      onBlur={(e) => {
                        const roleSlugs = e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        patchItem(it, { roleSlugs });
                      }}
                    />
                    {can('admin.menus.write') ? (
                      <button
                        type="button"
                        className="text-xs text-red-700 hover:underline md:col-span-1"
                        onClick={() => deleteItem(it.id)}
                      >
                        Verwijder
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {can('admin.menus.write') ? (
              <div className="mt-3 flex flex-col gap-1 border-t border-line pt-2 text-xs text-muted">
                <p>
                  Nieuw item:{' '}
                  <code className="text-[10px]">label | href | sortOrder | rollen,komma</code>
                </p>
                {containerSlugs.length ? (
                  <label className="flex max-w-md flex-col gap-0.5 text-[11px] text-muted">
                    Container kiezen (vult href in; label blijft of wordt slug als leeg)
                    <select
                      className="rounded border border-line bg-white px-2 py-1 text-xs text-ink"
                      defaultValue=""
                      onChange={(e) => {
                        const slug = e.target.value;
                        if (!slug) return;
                        const cur = itemForms[m.id] ?? '';
                        setItemForms((f) => ({ ...f, [m.id]: mergeItemFormWithContainerHref(cur, slug) }));
                        e.target.value = '';
                      }}
                    >
                      <option value="">— kies een opgeslagen container —</option>
                      {containerSlugs.map((s) => (
                        <option key={s} value={s}>
                          {s} → /content/{s}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="text-[11px] text-muted">
                    Nog geen containers: maak er een in Admin → Content (&quot;Container opslaan&quot;), ververs deze
                    pagina of voeg hierboven handmatig <code>label | /content/jouw-slug | 0</code> in.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="min-w-[240px] flex-1 rounded border border-line px-2 py-1"
                    placeholder="Home | / | 0 | "
                    value={itemForms[m.id] ?? ''}
                    onChange={(e) => setItemForms((f) => ({ ...f, [m.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="rounded border border-line px-2 py-1 text-xs hover:bg-panel"
                    onClick={() => void loadContainerSlugs()}
                  >
                    Containers verversen
                  </button>
                  <button
                    type="button"
                    className="rounded bg-burgundy px-2 py-1 text-white hover:bg-burgundyDeep"
                    onClick={() => addItem(m.id)}
                  >
                    Item toevoegen
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
