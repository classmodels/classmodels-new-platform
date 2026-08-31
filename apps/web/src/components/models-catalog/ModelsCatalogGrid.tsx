'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { getApiBase, apiFetch, publicMediaUrl, parseApiErrorBody } from '@/lib/api';
import { CmProgressBar } from '@/components/CmProgressBar';
import { CatalogModelThumb } from '@/components/models-catalog/CatalogModelThumb';
import { useAuth } from '@/context/auth-context';
import { adminDownloadFile, adminFetch } from '@/lib/admin-api';
import { isGroupingRoleSlug } from '@/lib/catalog-visibility';
import { startImpersonationSession, clearImpersonationSession } from '@/lib/impersonation';
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
  gemeente?: string;
  profileThumbKey: string | null;
  isNewface: boolean;
  isTryout: boolean;
  isHighClass?: boolean;
  roleSlugs?: string[];
  isInactive: boolean;
  isDeleted?: boolean;
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

function ficheDisplayName(m: CatalogModel, isAdmin: boolean): string {
  if (isAdmin) return rosterFullName(m);
  return m.displayName || rosterFullName(m);
}

function formatAdminAddress(sh: Record<string, unknown>): string {
  const parts = [
    sheetStr(sh, 'straat'),
    [sheetStr(sh, 'postcode'), sheetStr(sh, 'gemeente')].filter(Boolean).join(' '),
    sheetStr(sh, 'land'),
  ].filter(Boolean);
  return parts.join(', ') || '—';
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

function buildMailBody(m: CatalogModel, isAdmin: boolean): string {
  const sh = m.sheet ?? {};
  const lines = [
    `Model: ${ficheDisplayName(m, isAdmin)}`,
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
    `Beschikbaar voor: ${m.beschikbaar.length ? m.beschikbaar.join(', ') : '—'}`,
  ];
  if (isAdmin) {
    lines.splice(
      6,
      0,
      '',
      `Straat: ${sheetStr(sh, 'straat') || '—'}`,
      `Postcode: ${sheetStr(sh, 'postcode') || '—'}`,
      `Land: ${sheetStr(sh, 'land') || '—'}`,
    );
    if (m.email) lines.push('', `E-mail: ${m.email}`);
    const gsm = sheetStr(sh, 'gsmModel');
    if (gsm) lines.push(`GSM: ${gsm}`);
    const ln = (m.lastName ?? '').trim();
    if (ln) lines.push(`Familienaam: ${ln}`);
  }
  return lines.filter(Boolean).join('\n');
}

function printModelSheet(m: CatalogModel, photoSrc: string, isAdmin: boolean) {
  const sh = m.sheet ?? {};
  const val = (k: string) => escapeHtml(sheetStr(sh, k) || '—');
  const naam = escapeHtml(ficheDisplayName(m, isAdmin));
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
      ${isAdmin ? `${box('Straat', val('straat'))}${box('Postcode', val('postcode'))}` : ''}
    </div>
    ${isAdmin ? `<div style="margin-top:8px">${box('Land', val('land'))}</div>` : ''}
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

function FieldBox({
  label,
  value,
  theme = 'light',
}: {
  label: string;
  value: string;
  theme?: 'light' | 'dark';
}) {
  const v = value.trim() || '—';
  if (theme === 'dark') {
    return (
      <div className="nieuw-model-detail-field">
        <span>{label}</span>
        <p>{v}</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm">
      <p className="font-serif text-[10px] font-bold uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-1 whitespace-pre-wrap font-serif text-sm leading-snug text-zinc-900">{v}</p>
    </div>
  );
}

function imgUrlFromKey(key: string | null): string {
  return key ? publicMediaUrl(key) : '';
}

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

function catalogCacheId(token: string | null, isAdmin: boolean): string {
  if (!token) return 'public';
  return isAdmin ? `admin:${token.slice(0, 8)}` : `member:${token.slice(0, 8)}`;
}

function readCatalogCache(cacheId: string): CatalogModel[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`cm_catalog_${cacheId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; rows: CatalogModel[] };
    if (Date.now() - parsed.at > CATALOG_CACHE_TTL_MS) return null;
    return Array.isArray(parsed.rows) ? parsed.rows : null;
  } catch {
    return null;
  }
}

function writeCatalogCache(cacheId: string, rows: CatalogModel[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      `cm_catalog_${cacheId}`,
      JSON.stringify({ at: Date.now(), rows }),
    );
  } catch {
    /* quota */
  }
}

function friendlyCatalogError(raw: string): string {
  const t = raw.trim();
  if (!t) return 'Modellen laden mislukt. Probeer opnieuw.';
  if (/ECONNRESET|upstream timeout|Upstream fout/i.test(t)) {
    return 'Verbinding met de server verbroken. Vernieuw de pagina of klik op Opnieuw proberen.';
  }
  return parseApiErrorBody(t);
}

function AdminFicheControls({
  m,
  token,
  dark,
  onUpdated,
  onDeleted,
}: {
  m: CatalogModel;
  token: string;
  dark?: boolean;
  onUpdated?: (
    patch: Pick<CatalogModel, 'id' | 'isInactive'> &
      Partial<Pick<CatalogModel, 'isNewface' | 'isTryout' | 'isHighClass' | 'isDeleted' | 'roleSlugs'>>,
  ) => void;
  onDeleted?: (id: string) => void;
}) {
  const { can } = useAuth();
  const [busy, setBusy] = useState(false);
  const [inactive, setInactive] = useState(m.isInactive);
  const [trashed, setTrashed] = useState(!!m.isDeleted);
  const [groupRoles, setGroupRoles] = useState<{ slug: string; label: string }[]>([]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(m.roleSlugs ?? []));

  useEffect(() => {
    setInactive(m.isInactive);
    setTrashed(!!m.isDeleted);
    const s = new Set(m.roleSlugs ?? []);
    if (m.isNewface) s.add('newface');
    if (m.isTryout) s.add('tryout');
    if (m.isHighClass) s.add('high-class');
    if (m.isInactive) s.add('inactief');
    if (m.isDeleted) s.add('verwijderd');
    setChecked(s);
  }, [m.id, m.isInactive, m.isDeleted, m.isNewface, m.isTryout, m.isHighClass, m.roleSlugs]);

  useEffect(() => {
    let cancelled = false;
    adminFetch<{ slug: string; label: string }[]>('/admin/roles', token)
      .then((rows) => {
        if (cancelled) return;
        const preferred = ['newface', 'tryout', 'high-class'];
        const grouping = rows.filter(
          (r) => isGroupingRoleSlug(r.slug) && r.slug !== 'inactief' && r.slug !== 'verwijderd',
        );
        const rest = grouping
          .filter((r) => !preferred.includes(r.slug))
          .sort((a, b) => a.label.localeCompare(b.label, 'nl'));
        const ordered = [
          ...preferred.map((slug) => grouping.find((r) => r.slug === slug)).filter(Boolean),
          ...rest,
        ] as { slug: string; label: string }[];
        setGroupRoles(ordered);
      })
      .catch(() => {
        if (!cancelled) {
          setGroupRoles([
            { slug: 'newface', label: 'Newface' },
            { slug: 'tryout', label: 'Try-out' },
            { slug: 'high-class', label: 'High class' },
            { slug: 'inactief', label: 'Inactief' },
          ]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!can('admin.users.write')) return null;

  const label = [m.firstName, m.lastName].filter(Boolean).join(' ').trim() || m.displayName;
  const sh = m.sheet ?? {};
  const gsm = sheetStr(sh, 'gsmModel');
  const moeder = sheetStr(sh, 'gsmMoeder');
  const vader = sheetStr(sh, 'gsmVader');

  const applyPatch = (slugs: string[]) => {
    const nextInactive = slugs.includes('inactief');
    setInactive(nextInactive);
    setTrashed(slugs.includes('verwijderd'));
    onUpdated?.({
      id: m.id,
      isInactive: nextInactive,
      isDeleted: slugs.includes('verwijderd'),
      isNewface: slugs.includes('newface'),
      isTryout: slugs.includes('tryout'),
      isHighClass: slugs.includes('high-class'),
      roleSlugs: slugs,
    });
  };

  const toggleGroup = async (slug: string, enabled: boolean) => {
    const prev = new Set(checked);
    const next = new Set(checked);
    if (enabled) next.add(slug);
    else next.delete(slug);
    setChecked(next);
    setBusy(true);
    try {
      const res = await adminFetch<{
        roleSlugs: string[];
      }>(`/admin/users/${m.id}/roles/toggle`, token, {
        method: 'POST',
        body: JSON.stringify({ roleSlug: slug, enabled }),
      });
      setChecked(new Set(res.roleSlugs));
      applyPatch(res.roleSlugs);
    } catch (e) {
      setChecked(prev);
      window.alert(e instanceof Error ? e.message : 'Groep bijwerken mislukt.');
    } finally {
      setBusy(false);
    }
  };

  const toggleInactive = async () => {
    const next = !inactive;
    const ok = window.confirm(
      next
        ? `${label} op inactief zetten?\n\nHet model verdwijnt uit New face, Try-out en High class. Je vindt het terug via de knop Inactief.`
        : `${label} weer actief zetten?`,
    );
    if (!ok) return;
    await toggleGroup('inactief', next);
  };

  const remove = async () => {
    const mail = m.email ? `\n${m.email}` : '';
    if (trashed) {
      const ok = window.confirm(
        `Dit model definitief wissen?\n\n${label}${mail}\n\nGegevens en foto’s verdwijnen. Dit kan niet ongedaan.`,
      );
      if (!ok) return;
      setBusy(true);
      try {
        await adminFetch(`/admin/users/${m.id}?permanent=1`, token, { method: 'DELETE' });
        onDeleted?.(m.id);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Verwijderen mislukt.');
        setBusy(false);
      }
      return;
    }
    const ok = window.confirm(
      `Dit model naar Verwijderd verplaatsen?\n\n${label}${mail}\n\nJe kunt het later terugzetten onder Type → Verwijderd of Admin → Rollen.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await adminFetch(`/admin/users/${m.id}`, token, { method: 'DELETE' });
      setTrashed(true);
      onUpdated?.({ id: m.id, isInactive: inactive, isDeleted: true, roleSlugs: [...checked, 'verwijderd'] });
      onDeleted?.(m.id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Verwijderen mislukt.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      await adminFetch(`/admin/users/${m.id}/restore`, token, { method: 'POST' });
      setTrashed(false);
      const slugs = [...checked].filter((s) => s !== 'verwijderd');
      setChecked(new Set(slugs));
      applyPatch(slugs);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Terugzetten mislukt.');
    } finally {
      setBusy(false);
    }
  };

  const fieldCls = dark ? 'nieuw-model-detail-admin-row' : 'text-xs text-zinc-800';

  return (
    <div
      className={
        dark
          ? 'nieuw-model-detail-admin'
          : 'mt-4 rounded-lg border border-zinc-300 bg-zinc-50 p-3'
      }
    >
      <p
        className={
          dark
            ? 'mb-2 text-[10px] font-bold uppercase tracking-wide'
            : 'text-[10px] font-bold uppercase tracking-wide text-zinc-600'
        }
        style={dark ? { color: 'var(--n-gold, #c4a574)' } : undefined}
      >
        Beheer (admin){trashed ? ' — verwijderd' : inactive ? ' — inactief' : ''}
      </p>

      <dl className={dark ? 'nieuw-model-detail-admin-dl' : 'mt-2 space-y-1 text-xs text-zinc-800'}>
        <div className={fieldCls}>
          <dt>E-mail</dt>
          <dd>{m.email?.trim() || '—'}</dd>
        </div>
        <div className={fieldCls}>
          <dt>Adres</dt>
          <dd>{formatAdminAddress(sh)}</dd>
        </div>
        <div className={fieldCls}>
          <dt>GSM model</dt>
          <dd>{gsm || '—'}</dd>
        </div>
        <div className={fieldCls}>
          <dt>GSM moeder</dt>
          <dd>{moeder || '—'}</dd>
        </div>
        <div className={fieldCls}>
          <dt>GSM vader</dt>
          <dd>{vader || '—'}</dd>
        </div>
      </dl>

      {groupRoles.length ? (
        <div className={dark ? 'nieuw-model-detail-admin-groups' : 'mt-3'}>
          <p
            className={
              dark
                ? 'mb-2 text-[10px] font-bold uppercase tracking-wide'
                : 'mt-2 text-[10px] font-bold uppercase tracking-wide text-zinc-600'
            }
            style={dark ? { color: 'var(--n-gold, #c4a574)' } : undefined}
          >
            Groepen
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {groupRoles.map((r) => (
              <label
                key={r.slug}
                className={
                  dark
                    ? 'nieuw-model-detail-admin-check'
                    : 'flex items-center gap-1.5 text-xs text-zinc-800'
                }
              >
                <input
                  type="checkbox"
                  checked={checked.has(r.slug)}
                  disabled={busy}
                  onChange={(e) => void toggleGroup(r.slug, e.target.checked)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {trashed ? (
          <button
            type="button"
            className={dark ? 'nieuw-btn' : 'rounded-lg border border-zinc-400 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100'}
            disabled={busy}
            onClick={() => void restore()}
          >
            Terugzetten
          </button>
        ) : (
          <button
            type="button"
            className={dark ? 'nieuw-btn nieuw-btn-ghost' : 'rounded-lg border border-zinc-400 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100'}
            disabled={busy}
            onClick={() => void toggleInactive()}
          >
            {inactive ? 'Weer actief zetten' : 'Op inactief zetten'}
          </button>
        )}
        <button
          type="button"
          className={dark ? 'nieuw-btn nieuw-btn-ghost' : 'rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-100'}
          disabled={busy}
          onClick={() => void remove()}
          style={dark ? { borderColor: '#8a3a3a', color: '#e8b4b4' } : undefined}
        >
          {trashed ? 'Definitief wissen' : 'Naar verwijderd'}
        </button>
      </div>
    </div>
  );
}

export function ModelDetailDialog({
  m,
  initialPhotoSrc,
  isAdmin,
  token,
  onClose,
  theme = 'light',
  onUpdated,
  onDeleted,
}: {
  m: CatalogModel;
  initialPhotoSrc: string;
  isAdmin: boolean;
  token: string | null;
  onClose: () => void;
  theme?: 'light' | 'dark';
  onUpdated?: (
    patch: Pick<CatalogModel, 'id' | 'isInactive'> &
      Partial<Pick<CatalogModel, 'isNewface' | 'isTryout' | 'isHighClass' | 'isDeleted' | 'roleSlugs'>>,
  ) => void;
  onDeleted?: (id: string) => void;
}) {
  const [detail, setDetail] = useState<CatalogModel | null>(m.sheet ? m : null);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(!m.sheet);

  useEffect(() => {
    if (m.sheet) {
      setDetail(m);
      setDetailLoading(false);
      return;
    }
    const h = new Headers();
    if (token) h.set('Authorization', `Bearer ${token}`);
    let cancelled = false;
    setDetailLoading(true);
    setDetailErr(null);
    fetch(`${getApiBase()}/catalog/models/${m.id}`, { headers: h })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<CatalogModel>;
      })
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setDetailErr(e instanceof Error ? e.message : 'Fiche laden mislukt');
          setDetail(m);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [m, token]);

  const active = detail ?? m;
  const sh = active.sheet ?? {};
  const v = (key: string) => sheetStr(sh, key) || '—';
  const [photoKeys, setPhotoKeys] = useState<string[]>(initialPhotoSrc ? [initialPhotoSrc] : []);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!token) {
      setPhotoKeys(initialPhotoSrc ? [initialPhotoSrc] : []);
      return;
    }
    const h = new Headers({ Authorization: `Bearer ${token}` });
    fetch(`${getApiBase()}/catalog/models/${m.id}/gallery`, { headers: h })
      .then((r) => (r.ok ? r.json() : { keys: [] }))
      .then((data: { keys?: string[] }) => {
        const keys = Array.isArray(data.keys) && data.keys.length ? data.keys : initialPhotoSrc ? [initialPhotoSrc] : [];
        setPhotoKeys(keys);
        setSlideIndex(0);
      })
      .catch(() => setPhotoKeys(initialPhotoSrc ? [initialPhotoSrc] : []));
  }, [m.id, token, initialPhotoSrc]);

  const photoSrc = photoKeys[slideIndex] ? imgUrlFromKey(photoKeys[slideIndex]) : '';
  const thumbNavDisabled = photoKeys.length <= 1;
  const title = ficheDisplayName(active, isAdmin);

  /** Swipen door de foto's van dit model (links/rechts vegen op de foto). */
  const touchStartX = useRef<number | null>(null);
  const goPrevPhoto = () => setSlideIndex((i) => (i <= 0 ? photoKeys.length - 1 : i - 1));
  const goNextPhoto = () => setSlideIndex((i) => (i >= photoKeys.length - 1 ? 0 : i + 1));
  const onPhotoTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onPhotoTouchEnd = (e: TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX == null || photoKeys.length <= 1) return;
    const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goNextPhoto();
    else goPrevPhoto();
  };

  const dark = theme === 'dark';
  const fields = (
    <>
      <FieldBox theme={theme} label="Gemeente" value={v('gemeente')} />
      <FieldBox theme={theme} label="Geslacht" value={genderNl(active.gender)} />
      <FieldBox theme={theme} label="Nationaliteit" value={v('nationaliteit')} />
      <FieldBox theme={theme} label="Lengte" value={v('lengte')} />
      <FieldBox theme={theme} label="Maat" value={v('maat')} />
      <FieldBox theme={theme} label="Confectiemaat" value={v('confectiemaat')} />
      <FieldBox theme={theme} label="Schoenmaat" value={v('schoenmaat')} />
      <FieldBox theme={theme} label="BH-maat" value={v('bhMaat')} />
      <FieldBox theme={theme} label="Borstomtrek" value={v('borstomtrek')} />
      <FieldBox theme={theme} label="Taille" value={v('taille')} />
      <FieldBox theme={theme} label="Heupomtrek" value={v('heupomtrek')} />
      <FieldBox theme={theme} label="Jeansmaat" value={v('jeansmaat')} />
      <FieldBox theme={theme} label="Haarkleur" value={v('haarkleur')} />
      <FieldBox theme={theme} label="Kleur ogen" value={v('kleurOgen')} />
      <FieldBox theme={theme} label="Ervaring" value={v('ervaringen')} />
      <FieldBox theme={theme} label="Over mij" value={v('overMij')} />
      <FieldBox theme={theme} label="Geboortedatum" value={v('geboortedatum')} />
      <div className={dark ? undefined : 'sm:col-span-2'} style={dark ? { gridColumn: '1 / -1' } : undefined}>
        <FieldBox
          theme={theme}
          label="Beschikbaar voor"
          value={active.beschikbaar.length ? active.beschikbaar.join(', ') : '—'}
        />
      </div>
    </>
  );

  if (dark) {
    return (
      <div className="nieuw-model-detail-backdrop" role="presentation" onClick={onClose}>
        <div
          className="nieuw-model-detail"
          role="dialog"
          aria-modal="true"
          aria-labelledby="model-detail-title"
          onClick={(e) => e.stopPropagation()}
        >
          {detailLoading ? (
            <div className="mb-4 px-1">
              <CmProgressBar label="Modellenfiche laden…" />
            </div>
          ) : null}
          {detailErr ? (
            <p className="mb-3 text-sm" style={{ color: '#d4a0a0' }}>
              Sommige gegevens konden niet worden geladen.
            </p>
          ) : null}
          <div className="nieuw-model-detail-top">
            <p className="nieuw-model-detail-brand">Class-Models</p>
            <button
              type="button"
              className="nieuw-model-detail-close"
              onClick={onClose}
              aria-label="Sluiten"
            >
              ×
            </button>
          </div>

          <div className="nieuw-model-detail-grid">
            <div>
              {photoSrc ? (
                <div className="nieuw-model-detail-photo">
                  <div
                    className="flex w-full touch-pan-y select-none justify-center"
                    onTouchStart={onPhotoTouchStart}
                    onTouchEnd={onPhotoTouchEnd}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc} alt="" />
                  </div>
                  {photoKeys.length > 0 ? (
                    <div className="nieuw-model-detail-nav">
                      <button type="button" disabled={thumbNavDisabled} aria-label="Vorige foto" onClick={goPrevPhoto}>
                        ‹
                      </button>
                      <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                        {slideIndex + 1} / {photoKeys.length}
                      </span>
                      <button type="button" disabled={thumbNavDisabled} aria-label="Volgende foto" onClick={goNextPhoto}>
                        ›
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  className="nieuw-model-detail-photo"
                  style={{
                    aspectRatio: '3 / 4',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#6f6a5f',
                    fontSize: 13,
                  }}
                >
                  Geen foto
                </div>
              )}
            </div>

            <div>
              <h2 id="model-detail-title" className="nieuw-model-detail-title">
                {title}
                {active.age != null ? <span> — {active.age} jaar</span> : null}
              </h2>

              <div className="nieuw-model-detail-fields">{fields}</div>

              {isAdmin && token ? (
                <AdminFicheControls
                  m={active}
                  token={token}
                  dark
                  onUpdated={onUpdated}
                  onDeleted={(id) => {
                    onDeleted?.(id);
                    onClose();
                  }}
                />
              ) : null}

              <div className="nieuw-model-detail-actions">
                <button
                  type="button"
                  className="nieuw-btn"
                  onClick={() => printModelSheet(active, photoSrc, isAdmin)}
                  disabled={detailLoading}
                >
                  Afdrukken
                </button>
                <button
                  type="button"
                  className="nieuw-btn nieuw-btn-ghost"
                  onClick={() => {
                    window.location.href = `mailto:?subject=${encodeURIComponent(`Model: ${title}`)}&body=${encodeURIComponent(buildMailBody(active, isAdmin))}`;
                  }}
                >
                  Doorsturen per mail
                </button>
                <button type="button" className="nieuw-btn nieuw-btn-ghost" onClick={onClose}>
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        {detailLoading ? (
          <div className="mb-4 px-1">
            <CmProgressBar label="Modellenfiche laden…" />
          </div>
        ) : null}
        {detailErr ? (
          <p className="mb-3 text-sm text-amber-800">Sommige gegevens konden niet worden geladen.</p>
        ) : null}
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
            {photoSrc ? (
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm">
                <div
                  className="flex w-full touch-pan-y select-none justify-center bg-zinc-100"
                  onTouchStart={onPhotoTouchStart}
                  onTouchEnd={onPhotoTouchEnd}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoSrc}
                    alt=""
                    className="mx-auto block h-auto max-h-[min(92vh,960px)] w-full object-contain"
                  />
                </div>
                {photoKeys.length > 0 ? (
                  <div className="flex items-center justify-between border-t border-zinc-300 bg-zinc-800 px-2 py-1.5 text-white">
                    <button
                      type="button"
                      disabled={thumbNavDisabled}
                      className={`px-2 py-0.5 text-lg font-semibold ${thumbNavDisabled ? 'opacity-40' : 'hover:bg-white/10'}`}
                      aria-label="Vorige foto"
                      onClick={goPrevPhoto}
                    >
                      ‹
                    </button>
                    <span className="text-xs tabular-nums">
                      {slideIndex + 1} / {photoKeys.length}
                      {photoKeys.length > 1 ? <span className="ml-2 text-[10px] text-zinc-400">swipe of pijltjes</span> : null}
                    </span>
                    <button
                      type="button"
                      disabled={thumbNavDisabled}
                      className={`px-2 py-0.5 text-lg font-semibold ${thumbNavDisabled ? 'opacity-40' : 'hover:bg-white/10'}`}
                      aria-label="Volgende foto"
                      onClick={goNextPhoto}
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white text-sm text-zinc-500">
                Geen foto
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 id="model-detail-title" className="font-serif text-2xl font-semibold text-zinc-900">
              {title}
              {active.age != null ? (
                <span className="text-base font-normal text-zinc-500"> — {active.age} jaar</span>
              ) : null}
            </h2>

            {isAdmin ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 font-serif text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">Persoonlijke gegevens (admin)</p>
                <dl className="mt-2 space-y-1 text-xs text-zinc-800">
                  <div>
                    <span className="font-semibold">Familienaam: </span>
                    {(active.lastName ?? '').trim() || '—'}
                  </div>
                  <div>
                    <span className="font-semibold">E-mail: </span>
                    {active.email || '—'}
                  </div>
                  <div>
                    <span className="font-semibold">Telefoon: </span>
                    {v('gsmModel') !== '—' ? v('gsmModel') : '—'}
                  </div>
                  <div>
                    <span className="font-semibold">Adres: </span>
                    {formatAdminAddress(sh)}
                  </div>
                </dl>
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">{fields}</div>

            {isAdmin && token ? (
              <AdminFicheControls
                m={active}
                token={token}
                onUpdated={onUpdated}
                onDeleted={(id) => {
                  onDeleted?.(id);
                  onClose();
                }}
              />
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {isAdmin && token ? (
                <button
                  type="button"
                  className="rounded-lg border border-zinc-400 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                  onClick={() => {
                    void adminDownloadFile(
                      `/admin/set-card/users/${active.id}/preview.zip`,
                      token,
                      `setkaart-${ficheDisplayName(active, true).replace(/\s+/g, '-')}.zip`,
                    ).catch(() => window.alert('Setkaart download mislukt (concept moet compleet zijn).'));
                  }}
                >
                  Setkaart PDF
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                onClick={() => printModelSheet(active, photoSrc, isAdmin)}
                disabled={detailLoading}
              >
                Afdrukken
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                onClick={() => {
                  window.location.href = `mailto:?subject=${encodeURIComponent(`Model: ${title}`)}&body=${encodeURIComponent(buildMailBody(active, isAdmin))}`;
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

export type GalleryVestiging = {
  label: string;
  slug: string;
  count: number;
};

export type CatalogToolbarState = {
  tab: TabId;
  setTab: (t: TabId) => void;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  isAdmin: boolean;
  tabCounts: Record<TabId, number>;
  vestigingen: GalleryVestiging[];
  vestigingSel: Set<string>;
  toggleVestiging: (slug: string) => void;
};

function gemeenteSlug(g: string): string {
  return g.toLowerCase().trim().replace(/\s+/g, '-');
}

const GALLERY_VESTIGING_FALLBACK: GalleryVestiging[] = [
  { slug: 'hulshout', label: 'Hulshout', count: 0 },
  { slug: 'antwerpen', label: 'Antwerpen', count: 0 },
  { slug: 'gent', label: 'Gent', count: 0 },
  { slug: 'brussel', label: 'Brussel', count: 0 },
];

function mergeVestigingen(fromData: GalleryVestiging[]): GalleryVestiging[] {
  const out = [...fromData];
  for (const fb of GALLERY_VESTIGING_FALLBACK) {
    if (out.length >= 4) break;
    if (!out.some((v) => v.slug === fb.slug)) out.push(fb);
  }
  return out.slice(0, 4);
}

export type ModelsCatalogGridProps = {
  toolbarPlacement?: 'inline' | 'titlebar' | 'external';
  layout?: 'default' | 'gallery-wall';
  onTitlebarContent?: (node: ReactNode | null) => void;
  onToolbarState?: (state: CatalogToolbarState) => void;
};

export function ModelsCatalogGrid({
  toolbarPlacement = 'inline',
  layout = 'default',
  onTitlebarContent,
  onToolbarState,
}: ModelsCatalogGridProps = {}) {
  const router = useRouter();
  const { token, user, can, applySessionToken } = useAuth();
  const isAdmin = user?.roles?.includes('admin') ?? false;
  const canImpersonate = can('admin.users.write');
  const cacheId = catalogCacheId(token, isAdmin);
  const [rows, setRows] = useState<CatalogModel[]>(() => readCatalogCache(cacheId) ?? []);
  const [loading, setLoading] = useState(() => !readCatalogCache(cacheId)?.length);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('alle');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [avSel, setAvSel] = useState<Set<string>>(() => new Set());
  const [vestigingSel, setVestigingSel] = useState<Set<string>>(() => new Set());
  const [genderSel, setGenderSel] = useState<Set<string>>(() => new Set());
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<CatalogModel | null>(null);

  const openModelSheet = useCallback((m: CatalogModel) => {
    setModal(m);
  }, []);

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

  const vestigingen = useMemo((): GalleryVestiging[] => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const m of rows) {
      const g = (m.gemeente ?? '').trim();
      if (!g) continue;
      const slug = gemeenteSlug(g);
      const prev = counts.get(slug);
      if (prev) prev.count++;
      else counts.set(slug, { label: g, count: 1 });
    }
    return mergeVestigingen(
      [...counts.entries()]
        .map(([slug, { label, count }]) => ({ slug, label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'nl')),
    );
  }, [rows]);

  const toggleVestiging = useCallback((slug: string) => {
    setVestigingSel((prev) => {
      const n = new Set(prev);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });
  }, []);

  useEffect(() => {
    if (toolbarPlacement !== 'external' || !onToolbarState) return;
    onToolbarState({
      tab,
      setTab,
      filtersOpen,
      setFiltersOpen,
      isAdmin,
      tabCounts,
      vestigingen,
      vestigingSel,
      toggleVestiging,
    });
  }, [
    toolbarPlacement,
    onToolbarState,
    tab,
    filtersOpen,
    isAdmin,
    tabCounts,
    vestigingen,
    vestigingSel,
    toggleVestiging,
  ]);

  const loadAbortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const ac = new AbortController();
    loadAbortRef.current = ac;
    setLoading(true);
    setLoadErr(null);
    try {
      const h = new Headers();
      if (token) h.set('Authorization', `Bearer ${token}`);
      const res = await fetch(`${getApiBase()}/catalog/models`, {
        headers: h,
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as CatalogModel[];
      const next = Array.isArray(data) ? data : [];
      setRows(next);
      writeCatalogCache(cacheId, next);
      if (typeof document !== 'undefined') {
        for (const m of next.slice(0, 6)) {
          if (!m.profileThumbKey) continue;
          const href = imgUrl(m.profileThumbKey);
          if (!href) continue;
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = href;
          document.head.appendChild(link);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Laden mislukt';
      setLoadErr(friendlyCatalogError(msg));
      setRows([]);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [token, cacheId]);

  useEffect(() => {
    void load();
    return () => loadAbortRef.current?.abort();
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
    if (m.isDeleted) return false;
    if (!isAdmin && m.isInactive) return false;
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
        return !m.isInactive;
    }
  };

  const matchesFilters = (m: CatalogModel): boolean => {
    if (vestigingSel.size) {
      const raw = (m.gemeente ?? '').toLowerCase().trim();
      const slug = gemeenteSlug(m.gemeente ?? '');
      const match = [...vestigingSel].some((sel) => slug === sel || raw.includes(sel.replace(/-/g, ' ')));
      if (!match) return false;
    }
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
    [rows, tab, vestigingSel, avSel, genderSel, ageMin, ageMax, q],
  );

  const imgUrl = (key: string | null) =>
    key ? publicMediaUrl(key) : '';

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
        `Dit model naar Verwijderd verplaatsen?\n\n${label}${mail}\n\nJe kunt het later terugzetten.`,
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

  const openAsModel = async (m: CatalogModel, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || !user?.email) return;
    try {
      startImpersonationSession(token, user.email);
      const res = await apiFetch<{ access_token: string }>('/auth/impersonate', {
        method: 'POST',
        token,
        body: JSON.stringify({ targetUserId: m.id }),
      });
      await applySessionToken(res.access_token);
      router.push('/modellen?tab=profiel');
    } catch (err) {
      clearImpersonationSession();
      window.alert(err instanceof Error ? err.message : 'Openen als model mislukt.');
    }
  };

  const modalPhoto = modal?.profileThumbKey ? imgUrl(modal.profileThumbKey) : '';
  const isGallery = layout === 'gallery-wall';

  const outerClass = isGallery
    ? 'min-h-0 text-white'
    : 'rounded-cm border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 md:p-6';

  const gridClass = isGallery
    ? `grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${loading ? 'pointer-events-none opacity-60' : ''}`
    : `grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 ${loading ? 'pointer-events-none opacity-60' : ''}`;

  return (
    <div className={outerClass}>
      {loading ? (
        <div className={shown.length === 0 ? 'py-10' : 'mb-4'}>
          <CmProgressBar
            label={shown.length === 0 ? 'Modellen laden…' : 'Modellen bijwerken…'}
          />
        </div>
      ) : null}
      {!loading && shown.length && !shown.some((m) => m.profileThumbKey) ? (
        <p className="mb-3 text-center text-xs text-zinc-500">Foto&apos;s worden geladen…</p>
      ) : null}
      {loadErr ? (
        <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 ${isGallery ? 'px-[0.5vw]' : ''}`}>
          <p className={`text-sm ${isGallery ? 'text-red-200' : 'text-red-300'}`}>{loadErr}</p>
          <button
            type="button"
            className={
              isGallery
                ? 'rounded-[0.35vw] border border-amber-200/35 bg-black/40 px-[1vw] py-[0.45vw] text-[0.85vw] font-semibold text-white hover:bg-black/55'
                : 'rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-800'
            }
            onClick={() => void load()}
          >
            Opnieuw proberen
          </button>
        </div>
      ) : null}

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
        <div
          className={
            isGallery
              ? 'mb-[1.2vw] space-y-2 rounded-[0.35vw] border border-amber-200/25 bg-black/45 p-[1vw] text-[0.78vw] leading-tight backdrop-blur-sm'
              : 'mb-6 space-y-2 rounded-lg border border-zinc-600 bg-zinc-900 p-2.5 text-[11px] leading-tight md:p-3'
          }
        >
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

      {loading && !shown.length ? null : !shown.length && !loading ? (
        <p className={`py-8 text-center ${isGallery ? 'text-[0.95vw] text-white/55' : 'text-sm text-zinc-400'}`}>
          {loadErr ? 'Geen modellen geladen.' : 'Geen modellen voor deze filters.'}
        </p>
      ) : shown.length ? (
        <div className={gridClass}>
          {shown.map((m, idx) => (
            <div key={m.id} className="min-w-0">
              <button
                type="button"
                className={
                  isGallery
                    ? 'group w-full cursor-pointer text-left outline-none transition focus-visible:ring-2 focus-visible:ring-amber-200/50'
                    : 'w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 text-left shadow-sm outline-none transition hover:border-zinc-500 focus-visible:ring-2 focus-visible:ring-lime-300/50'
                }
                onClick={() => openModelSheet(m)}
              >
                {m.profileThumbKey ? (
                  <CatalogModelThumb
                    src={imgUrl(m.profileThumbKey)}
                    priority={idx < 12}
                    className={isGallery ? 'h-full w-full rounded-none object-cover' : undefined}
                  />
                ) : (
                  <div
                    className={
                      isGallery
                        ? 'flex aspect-[3/4] items-center justify-center bg-black/40 text-xs text-white/45'
                        : 'flex aspect-[3/4] items-center justify-center rounded-md bg-zinc-800 px-2 text-center text-[10px] text-zinc-500'
                    }
                  >
                    Geen foto
                  </div>
                )}
                <p
                  className={
                    isGallery
                      ? 'mt-2.5 truncate text-center text-xs font-light tracking-wide text-white/90'
                      : 'mt-1.5 truncate px-0.5 text-xs font-semibold text-white'
                  }
                >
                  {m.displayName}
                  {m.age != null ? (
                    <span className={isGallery ? 'text-white/72' : 'font-normal text-zinc-400'}>
                      {' '}
                      ({m.age})
                    </span>
                  ) : null}
                </p>
              </button>
              {isAdmin ? (
                <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                  <button
                    type="button"
                    className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] text-zinc-200 hover:bg-zinc-800"
                    onClick={() => openModelSheet(m)}
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
                  {canImpersonate ? (
                    <button
                      type="button"
                      className="rounded border border-lime-600 px-1.5 py-0.5 text-[10px] text-lime-200 hover:bg-lime-950/80"
                      title="Portaal openen als dit model (profiel, push, afspraken)"
                      onClick={(e) => void openAsModel(m, e)}
                    >
                      Als model
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {modal ? (
        <ModelDetailDialog
          m={modal}
          initialPhotoSrc={modalPhoto}
          isAdmin={isAdmin}
          token={token}
          onClose={() => setModal(null)}
          onUpdated={(patch) => {
            setRows((prev) => prev.map((x) => (x.id === patch.id ? { ...x, ...patch } : x)));
            setModal((cur) => (cur && cur.id === patch.id ? { ...cur, ...patch } : cur));
          }}
          onDeleted={(id) => {
            setRows((prev) => prev.filter((x) => x.id !== id));
            setModal(null);
          }}
        />
      ) : null}
    </div>
  );
}
