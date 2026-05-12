'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { getApiBase } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { adminFetch } from '@/lib/admin-api';
import { portalTitlebarPillClass } from '@/components/model-portal/portal-titlebar-pill';

export type CatalogModel = {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
  age: number | null;
  gender: '' | 'man' | 'vrouw';
  beschikbaar: string[];
  beschikbaarSlugs: string[];
  profileThumbKey: string | null;
  isNewface: boolean;
  isTryout: boolean;
  isInactive: boolean;
  isFavorite: boolean;
  sheet?: Record<string, unknown>;
};

type TabId = 'alle' | 'favoriet' | 'newface' | 'tryout' | 'inactief';

function rosterFullName(m: CatalogModel): string {
  const fn = (m.firstName ?? '').trim();
  const ln = (m.lastName ?? '').trim();
  if (fn && ln) return `${fn} ${ln}`.trim();
  if (fn) return fn;
  if (ln) return ln;
  return m.displayName;
}

function sheetStr(sh: Record<string, unknown> | undefined, key: string): string {
  if (!sh) return '';
  const v = sh[key];
  if (v == null) return '';
  const t = String(v).trim();
  return t || '';
}

function escapeHtml(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function genderNl(g: CatalogModel['gender']): string {
  if (g === 'man') return 'Man';
  if (g === 'vrouw') return 'Vrouw';
  return '—';
}

function buildMailBody(m: CatalogModel): string {
  const sh = m.sheet ?? {};
  const lines = [
    `Model: ${rosterFullName(m)}`,
    m.age != null ? `Leeftijd: ${m.age} jaar` : '',
    `Geslacht: ${genderNl(m.gender)}`,
    '',
    `Gemeente: ${sheetStr(sh, 'gemeente') || '—'}`,
    `Nationaliteit: ${sheetStr(sh, 'nationaliteit') || '—'}`,
    `Geboortedatum: ${sheetStr(sh, 'geboortedatum') || '—'}`,
    `Lengte: ${sheetStr(sh, 'lengte') || '—'}`,
    `Maat: ${sheetStr(sh, 'maat') || '—'}`,
    `Confectiemaat: ${sheetStr(sh, 'confectiemaat') || '—'}`,
    `Schoenmaat: ${sheetStr(sh, 'schoenmaat') || '—'}`,
    `BH-maat: ${sheetStr(sh, 'bhMaat') || '—'}`,
    `Borstomtrek: ${sheetStr(sh, 'borstomtrek') || '—'}`,
    `Taille: ${sheetStr(sh, 'taille') || '—'}`,
    `Heupomtrek: ${sheetStr(sh, 'heupomtrek') || '—'}`,
    `Jeansmaat: ${sheetStr(sh, 'jeansmaat') || '—'}`,
    `Haarkleur: ${sheetStr(sh, 'haarkleur') || '—'}`,
    `Kleur ogen: ${sheetStr(sh, 'kleurOgen') || '—'}`,
    '',
    `Ervaring: ${sheetStr(sh, 'ervaringen') || '—'}`,
    `Over mij: ${sheetStr(sh, 'overMij') || '—'}`,
    '',
    `Straat: ${sheetStr(sh, 'straat') || '—'}`,
    `Postcode: ${sheetStr(sh, 'postcode') || '—'}`,
    `Land: ${sheetStr(sh, 'land') || '—'}`,
    '',
    `Beschikbaar voor: ${m.beschikbaar.length ? m.beschikbaar.join(', ') : '—'}`,
  ];
  if (m.email) lines.push('', `E-mail (admin): ${m.email}`);
  const gsm = sheetStr(sh, 'gsmModel');
  if (gsm) lines.push(`GSM: ${gsm}`);
  return lines.filter(Boolean).join('\n');
}

function printModelSheet(m: CatalogModel, photoSrc: string) {
  const sh = m.sheet ?? {};
  const val = (k: string) => escapeHtml(sheetStr(sh, k) || '—');
  const naam = escapeHtml(rosterFullName(m));
  const besch = escapeHtml(m.beschikbaar.length ? m.beschikbaar.join(', ') : '—');
  const photo =
    photoSrc && m.profileThumbKey
      ? `<div style="text-align:center;margin-bottom:16px"><img src="${escapeHtml(photoSrc)}" alt="" style="max-width:280px;width:100%;height:auto;border-radius:12px" /></div>`
      : '';
  const box = (label: string, v: string) =>
    `<div style="border:1px solid #d4d4d8;border-radius:8px;padding:10px;background:#fff">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#52525b">${escapeHtml(label)}</div>
      <div style="margin-top:6px;font-size:13px;font-family:Georgia,'Times New Roman',serif;color:#18181b">${v}</div>
    </div>`;

  const w = window.open('', '_blank');
  if (!w) return;
  const inner = `
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;margin:0 0 16px">${naam}</h1>
    ${photo}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-family:Georgia,'Times New Roman',serif">
      ${box('Naam', naam)}
      ${box('Gemeente', val('gemeente'))}
      ${box('Geslacht', escapeHtml(genderNl(m.gender)))}
      ${box('Nationaliteit', val('nationaliteit'))}
      ${box('Lengte', val('lengte'))}
      ${box('Maat', val('maat'))}
      ${box('Confectiemaat', val('confectiemaat'))}
      ${box('Schoenmaat', val('schoenmaat'))}
      ${box('BH-maat', val('bhMaat'))}
      ${box('Borstomtrek', val('borstomtrek'))}
      ${box('Taille', val('taille'))}
      ${box('Heupomtrek', val('heupomtrek'))}
      ${box('Jeansmaat', val('jeansmaat'))}
      ${box('Haarkleur', val('haarkleur'))}
      ${box('Kleur ogen', val('kleurOgen'))}
      ${box('Ervaring', val('ervaringen'))}
      ${box('Over mij', val('overMij'))}
      ${box('Geboortedatum', val('geboortedatum'))}
      ${box('Straat', val('straat'))}
      ${box('Postcode', val('postcode'))}
    </div>
    <div style="margin-top:8px">${box('Land', val('land'))}</div>
    <div style="margin-top:8px">${box('Beschikbaar voor', besch)}</div>
  `;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${naam}</title></head><body style="margin:24px;background:#fafafa">${inner}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 200);
}

function FieldBox({ label, value }: { label: string; value: string }) {
  const v = value.trim() || '—';
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm">
      <p className="font-serif text-[10px] font-bold uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-1 whitespace-pre-wrap font-serif text-sm leading-snug text-zinc-900">{v}</p>
    </div>
  );
}

function ModelDetailDialog({
  m,
  photoSrc,
  isAdmin,
  onClose,
}: {
  m: CatalogModel;
  photoSrc: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const sh = m.sheet ?? {};
  const v = (key: string) => sheetStr(sh, key) || '—';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-zinc-100 p-4 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="font-serif text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Class-Models</p>
          <button
            type="button"
            className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            onClick={onClose}
            aria-label="Sluiten"
          >
            ×
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr] lg:items-start">
          <div className="min-w-0">
            {m.profileThumbKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc}
                alt=""
                className="w-full rounded-xl border border-zinc-200 object-cover shadow-sm"
                style={{ aspectRatio: '3 / 4' }}
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white text-sm text-zinc-500">
                Geen foto
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 id="model-detail-title" className="font-serif text-2xl font-semibold text-zinc-900">
              {rosterFullName(m)}
              {m.age != null ? (
                <span className="text-base font-normal text-zinc-500"> — {m.age} jaar</span>
              ) : null}
            </h2>
            {isAdmin && m.email ? <p className="mt-1 font-serif text-xs text-zinc-600">{m.email}</p> : null}

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FieldBox label="Naam" value={rosterFullName(m)} />
              <FieldBox label="Gemeente" value={v('gemeente')} />
              <FieldBox label="Geslacht" value={genderNl(m.gender)} />
              <FieldBox label="Nationaliteit" value={v('nationaliteit')} />
              <FieldBox label="Lengte" value={v('lengte')} />
              <FieldBox label="Maat" value={v('maat')} />
              <FieldBox label="Confectiemaat" value={v('confectiemaat')} />
              <FieldBox label="Schoenmaat" value={v('schoenmaat')} />
              <FieldBox label="BH-maat" value={v('bhMaat')} />
              <FieldBox label="Borstomtrek" value={v('borstomtrek')} />
              <FieldBox label="Taille" value={v('taille')} />
              <FieldBox label="Heupomtrek" value={v('heupomtrek')} />
              <FieldBox label="Jeansmaat" value={v('jeansmaat')} />
              <FieldBox label="Haarkleur" value={v('haarkleur')} />
              <FieldBox label="Kleur ogen" value={v('kleurOgen')} />
              <FieldBox label="Ervaring" value={v('ervaringen')} />
              <FieldBox label="Over mij" value={v('overMij')} />
              <FieldBox label="Geboortedatum" value={v('geboortedatum')} />
              <FieldBox label="Straat" value={v('straat')} />
              <FieldBox label="Postcode" value={v('postcode')} />
              <div className="sm:col-span-2">
                <FieldBox label="Land" value={v('land')} />
              </div>
              <div className="sm:col-span-2">
                <FieldBox label="Beschikbaar voor" value={m.beschikbaar.length ? m.beschikbaar.join(', ') : '—'} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                onClick={() => printModelSheet(m, photoSrc)}
              >
                Afdrukken
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                onClick={() => {
                  window.location.href = `mailto:?subject=${encodeURIComponent(`Model: ${rosterFullName(m)}`)}&body=${encodeURIComponent(buildMailBody(m))}`;
                }}
              >
                Doorsturen per mail
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={onClose}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CatalogToolbarControls({
  variant,
  tab,
  setTab,
  filtersOpen,
  setFiltersOpen,
  isAdmin,
  tabCounts,
}: {
  variant: 'card' | 'titlebar';
  tab: TabId;
  setTab: (t: TabId) => void;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  isAdmin: boolean;
  tabCounts: Record<TabId, number>;
}) {
  const tabs: [TabId, string][] = [
    ['alle', 'Alle'],
    ...(isAdmin ? ([['favoriet', 'Favorieten']] as [TabId, string][]) : []),
    ['newface', 'Newface'],
    ...(isAdmin ? ([['tryout', 'Try-out'], ['inactief', 'Inactief']] as [TabId, string][]) : []),
  ];

  const countFor = (id: TabId) =>
    id === 'alle'
      ? tabCounts.alle
      : id === 'favoriet'
        ? tabCounts.favoriet
        : id === 'newface'
          ? tabCounts.newface
          : id === 'tryout'
            ? tabCounts.tryout
            : tabCounts.inactief;

  if (variant === 'titlebar') {
    return (
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          className={portalTitlebarPillClass(filtersOpen)}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          {filtersOpen ? 'Filter sluiten' : 'Filter modellen'}
        </button>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={portalTitlebarPillClass(tab === id)}
            onClick={() => setTab(id)}
          >
            {label} ({countFor(id)})
          </button>
        ))}
      </div>
    );
  }

  const filterCls =
    'inline-flex w-full max-w-[220px] shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 sm:w-auto sm:max-w-none';

  const tabBase =
    'rounded-lg border px-3 py-2 text-xs font-bold whitespace-nowrap sm:text-[13px]';

  const tabCls = (active: boolean) =>
    active
      ? `${tabBase} border-lime-300 bg-lime-400 text-zinc-900`
      : `${tabBase} border-zinc-600 bg-zinc-950 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900`;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <button type="button" className={filterCls} onClick={() => setFiltersOpen((v) => !v)}>
        {filtersOpen ? 'Filter sluiten' : 'Filter modellen'}
      </button>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={tabCls(tab === id)}>
            {label}{' '}
            <span className="ml-1 rounded-full bg-black/15 px-2 py-0.5 text-[10px]">{countFor(id)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export type ModelsCatalogGridProps = {
  toolbarPlacement?: 'inline' | 'titlebar';
  onTitlebarContent?: (node: ReactNode | null) => void;
};

export function ModelsCatalogGrid({
  toolbarPlacement = 'inline',
  onTitlebarContent,
}: ModelsCatalogGridProps = {}) {
  const { token, user } = useAuth();
  const isAdmin = user?.roles?.includes('admin') ?? false;
  const [rows, setRows] = useState<CatalogModel[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('alle');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [avSel, setAvSel] = useState<Set<string>>(() => new Set());
  const [genderSel, setGenderSel] = useState<Set<string>>(() => new Set());
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<CatalogModel | null>(null);

  const titlebarSlotRef = useRef(onTitlebarContent);
  titlebarSlotRef.current = onTitlebarContent;

  const tabCounts = useMemo(() => {
    const c: Record<TabId, number> = {
      alle: 0,
      favoriet: 0,
      newface: 0,
      tryout: 0,
      inactief: 0,
    };
    for (const m of rows) {
      if (!m.isInactive) c.alle++;
      if (m.isFavorite && !m.isInactive) c.favoriet++;
      if (m.isNewface && !m.isInactive) c.newface++;
      if (m.isTryout && !m.isInactive) c.tryout++;
      if (m.isInactive) c.inactief++;
    }
    return c;
  }, [rows]);

  useEffect(() => {
    if (toolbarPlacement !== 'titlebar') return;
    const setSlot = titlebarSlotRef.current;
    if (!setSlot) return;
    setSlot(
      <CatalogToolbarControls
        variant="titlebar"
        tab={tab}
        setTab={setTab}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
        isAdmin={isAdmin}
        tabCounts={tabCounts}
      />,
    );
    return () => setSlot(null);
  }, [toolbarPlacement, tab, filtersOpen, isAdmin, tabCounts]);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const h = new Headers();
      if (token) h.set('Authorization', `Bearer ${token}`);
      const res = await fetch(`${getApiBase()}/catalog/models`, { headers: h });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as CatalogModel[];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Laden mislukt');
      setRows([]);
    }
  }, [token]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const allAvail = useMemo(() => {
    const s = new Set<string>();
    for (const m of rows) {
      for (const a of m.beschikbaar) {
        if (a.trim()) s.add(a);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'nl'));
  }, [rows]);

  const visibleForTab = (m: CatalogModel): boolean => {
    switch (tab) {
      case 'alle':
        return !m.isInactive;
      case 'favoriet':
        return m.isFavorite && !m.isInactive;
      case 'newface':
        return m.isNewface && !m.isInactive;
      case 'tryout':
        return m.isTryout && !m.isInactive;
      case 'inactief':
        return m.isInactive;
      default:
        return true;
    }
  };

  const matchesFilters = (m: CatalogModel): boolean => {
    if (avSel.size) {
      const has = m.beschikbaarSlugs.some((x) => avSel.has(x));
      if (!has) return false;
    }
    if (genderSel.size) {
      if (!m.gender || !genderSel.has(m.gender)) return false;
    }
    const amin = parseInt(ageMin, 10);
    const amax = parseInt(ageMax, 10);
    if (amin && (m.age == null || m.age < amin)) return false;
    if (amax && (m.age == null || m.age > amax)) return false;
    const qq = q.trim().toLowerCase();
    if (qq) {
      const dn = m.displayName.toLowerCase();
      const full = rosterFullName(m).toLowerCase();
      if (!dn.includes(qq) && !full.includes(qq)) return false;
    }
    return true;
  };

  const shown = useMemo(
    () => rows.filter((m) => visibleForTab(m) && matchesFilters(m)),
    [rows, tab, avSel, genderSel, ageMin, ageMax, q],
  );

  const imgUrl = (key: string | null) =>
    key ? `${getApiBase()}/media/public/${encodeURIComponent(key)}` : '';

  const postFlag = async (modelId: string, body: Record<string, boolean>) => {
    if (!token) return;
    await adminFetch(`/admin/catalog/models/${modelId}/flags`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    await load();
  };

  const postFav = async (modelId: string) => {
    if (!token) return;
    await adminFetch(`/admin/catalog/models/${modelId}/favorite`, token, { method: 'POST' });
    await load();
  };

  const deleteModelUser = async (m: CatalogModel, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;
    const label = rosterFullName(m);
    const mail = m.email ? `\n${m.email}` : '';
    if (
      !window.confirm(
        `Dit model definitief uit het systeem verwijderen?\n\n${label}${mail}\n\nAlle gegevens en geüploade foto’s worden gewist.`,
      )
    ) {
      return;
    }
    try {
      await adminFetch(`/admin/users/${m.id}`, token, { method: 'DELETE' });
      if (modal?.id === m.id) setModal(null);
      await load();
    } catch {
      window.alert('Verwijderen mislukt.');
    }
  };

  const modalPhoto = modal?.profileThumbKey ? imgUrl(modal.profileThumbKey) : '';

  return (
    <div className="rounded-cm border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 md:p-6">
      {loadErr ? <p className="mb-3 text-sm text-red-300">{loadErr}</p> : null}

      {toolbarPlacement === 'inline' ? (
        <CatalogToolbarControls
          variant="card"
          tab={tab}
          setTab={setTab}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
          isAdmin={isAdmin}
          tabCounts={tabCounts}
        />
      ) : null}

      {filtersOpen ? (
        <div className="mb-6 space-y-2 rounded-lg border border-zinc-600 bg-zinc-900 p-2.5 text-[11px] leading-tight md:p-3">
          {/* Rij 1: label + alle tags op één lijn (scroll bij smalle viewport) */}
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
            <span className="shrink-0 font-bold text-zinc-200">Beschikbaar voor</span>
            <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
              {allAvail.map((av) => {
                const slug = av.toLowerCase().trim().replace(/\s+/g, '-');
                const on = avSel.has(slug);
                return (
                  <label
                    key={av}
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded border border-zinc-500 bg-zinc-950 px-1.5 py-0.5 text-[10px] text-zinc-100"
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3 shrink-0"
                      checked={on}
                      onChange={() => {
                        setAvSel((prev) => {
                          const n = new Set(prev);
                          if (n.has(slug)) n.delete(slug);
                          else n.add(slug);
                          return n;
                        });
                      }}
                    />
                    <span className="whitespace-nowrap">{av}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {/* Rij 2: leeftijd + geslacht + zoeken op één lijn */}
          <div className="flex flex-nowrap items-center gap-x-2 gap-y-1 overflow-x-auto [-webkit-overflow-scrolling:touch] md:gap-x-3">
            <span className="shrink-0 font-bold text-zinc-200">Leeftijd</span>
            <input
              className="h-7 w-14 shrink-0 rounded border border-zinc-600 bg-zinc-950 px-1 text-[11px] text-zinc-100"
              type="number"
              placeholder="min"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
            />
            <span className="shrink-0 text-zinc-500">-</span>
            <input
              className="h-7 w-14 shrink-0 rounded border border-zinc-600 bg-zinc-950 px-1 text-[11px] text-zinc-100"
              type="number"
              placeholder="max"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
            />
            <span className="mx-0.5 hidden h-4 w-px shrink-0 bg-zinc-600 sm:inline-block" aria-hidden />
            <span className="shrink-0 font-bold text-zinc-200">Geslacht</span>
            {['man', 'vrouw'].map((g) => (
              <label key={g} className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] text-zinc-100">
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={genderSel.has(g)}
                  onChange={() =>
                    setGenderSel((prev) => {
                      const n = new Set(prev);
                      if (n.has(g)) n.delete(g);
                      else n.add(g);
                      return n;
                    })
                  }
                />
                {g === 'man' ? 'Man' : 'Vrouw'}
              </label>
            ))}
            <span className="mx-0.5 hidden h-4 w-px shrink-0 bg-zinc-600 md:inline-block" aria-hidden />
            <span className="shrink-0 font-bold text-zinc-200">Zoeken</span>
            <input
              className="h-7 min-w-[7rem] flex-1 rounded border border-zinc-600 bg-zinc-950 px-2 text-[11px] text-zinc-100 md:max-w-[220px] md:flex-none"
              type="search"
              placeholder="Naam"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {!shown.length ? (
        <p className="py-8 text-center text-sm text-zinc-400">Geen modellen voor deze filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {shown.map((m) => (
            <div key={m.id} className="min-w-0">
              <button
                type="button"
                className="w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 text-left shadow-sm outline-none transition hover:border-zinc-500 focus-visible:ring-2 focus-visible:ring-lime-300/50"
                onClick={() => setModal(m)}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-zinc-800">
                  {m.profileThumbKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgUrl(m.profileThumbKey)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-zinc-500">
                      Geen foto
                    </div>
                  )}
                </div>
                <p className="mt-1.5 truncate px-0.5 text-xs font-semibold text-white">
                  {m.displayName}
                  {m.age != null ? <span className="font-normal text-zinc-400"> ({m.age})</span> : null}
                </p>
              </button>
              {isAdmin ? (
                <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                  <button
                    type="button"
                    className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-200 hover:bg-zinc-800"
                    onClick={() => setModal(m)}
                  >
                    Info
                  </button>
                  <button
                    type="button"
                    className={`rounded border px-1.5 py-0.5 text-[10px] ${m.isFavorite ? 'border-red-400 bg-red-950 text-red-200' : 'border-zinc-600 text-zinc-200'}`}
                    onClick={() => void postFav(m.id)}
                  >
                    ♥
                  </button>
                  <button
                    type="button"
                    className={`rounded border px-1.5 py-0.5 text-[10px] ${m.isNewface ? 'border-lime-400 text-lime-200' : 'border-zinc-600 text-zinc-200'}`}
                    onClick={() => void postFlag(m.id, { newface: !m.isNewface })}
                  >
                    NF
                  </button>
                  <button
                    type="button"
                    className={`rounded border px-1.5 py-0.5 text-[10px] ${m.isTryout ? 'border-lime-400 text-lime-200' : 'border-zinc-600 text-zinc-200'}`}
                    onClick={() => void postFlag(m.id, { tryout: !m.isTryout })}
                  >
                    TO
                  </button>
                  <button
                    type="button"
                    className={`rounded border px-1.5 py-0.5 text-[10px] ${m.isInactive ? 'border-amber-400 text-amber-200' : 'border-zinc-600 text-zinc-200'}`}
                    onClick={() => void postFlag(m.id, { inactive: !m.isInactive })}
                  >
                    ⊗
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-700 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-950"
                    title="Model verwijderen"
                    onClick={(e) => void deleteModelUser(m, e)}
                  >
                    Verwijder
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {modal ? (
        <ModelDetailDialog m={modal} photoSrc={modalPhoto} isAdmin={isAdmin} onClose={() => setModal(null)} />
      ) : null}
    </div>
  );
}
