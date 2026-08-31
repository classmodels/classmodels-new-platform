'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getApiBase, publicMediaUrl } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import {
  ModelDetailDialog,
  type CatalogModel,
} from '@/components/models-catalog/ModelsCatalogGrid';
import { CatalogModelThumb } from '@/components/models-catalog/CatalogModelThumb';
import {
  clearImpersonationSession,
  startImpersonationSession,
} from '@/lib/impersonation';

function availSlug(label: string) {
  return label.toLowerCase().trim().replace(/\s+/g, '-');
}

const HIDDEN_TYPE_SLUGS = new Set(['admin', 'client', 'guest', 'fotograaf', 'model', 'inactief', 'verwijderd']);

function groupingLabel(slug: string): string {
  if (slug === 'newface') return 'New face';
  if (slug === 'tryout') return 'Try-out';
  if (slug === 'high-class') return 'High class';
  if (slug === 'inactief') return 'Inactief';
  if (slug === 'verwijderd') return 'Verwijderd';
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const AGE_TRACK_LO = 3;
const AGE_TRACK_HI = 80;

export function NieuwModelsGallery({
  title = 'Overzicht onze modellen',
}: {
  title?: string;
  subtitle?: string;
  showroomHref?: string;
}) {
  const router = useRouter();
  const { token, user, can, applySessionToken } = useAuth();
  const isAdmin = Boolean(user?.roles?.includes('admin') || can('*'));
  const canImpersonate = can('admin.users.write');
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<CatalogModel | null>(null);

  const [avSel, setAvSel] = useState<Set<string>>(() => new Set());
  const [genderSel, setGenderSel] = useState<Set<string>>(() => new Set());
  const [flagSel, setFlagSel] = useState<Set<string>>(() => new Set());
  const [ageMin, setAgeMin] = useState(AGE_TRACK_LO);
  const [ageMax, setAgeMax] = useState(AGE_TRACK_HI);
  const [q, setQ] = useState('');
  const [groupings, setGroupings] = useState<{ slug: string; label: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`${getApiBase()}/catalog/models`, { headers, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Modellen konden niet worden geladen.');
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        setModels(Array.isArray(data) ? (data as CatalogModel[]) : []);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Laden mislukt.');
        setModels([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`${getApiBase()}/catalog/groupings`, { headers, cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        const rows = Array.isArray(data)
          ? (data as { slug?: string; label?: string }[])
              .filter((x) => typeof x?.slug === 'string' && x.slug)
              .map((x) => ({ slug: x.slug as string, label: String(x.label || groupingLabel(x.slug as string)) }))
          : [];
        setGroupings(rows);
      })
      .catch(() => {
        if (!cancelled) setGroupings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  /** Jongste/oudste model met leeftijd — standaardpositie van de bollen. */
  const catalogAge = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const m of models) {
      if (m.isInactive) continue;
      if (m.age == null || !Number.isFinite(m.age)) continue;
      lo = Math.min(lo, m.age);
      hi = Math.max(hi, m.age);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      return { lo: AGE_TRACK_LO, hi: AGE_TRACK_HI };
    }
    return {
      lo: Math.min(AGE_TRACK_HI, Math.max(AGE_TRACK_LO, lo)),
      hi: Math.min(AGE_TRACK_HI, Math.max(AGE_TRACK_LO, hi)),
    };
  }, [models]);

  useEffect(() => {
    setAgeMin(catalogAge.lo);
    setAgeMax(catalogAge.hi);
  }, [catalogAge.lo, catalogAge.hi]);

  const allAvail = useMemo(() => {
    const s = new Set<string>();
    for (const m of models) {
      for (const a of m.beschikbaar ?? []) {
        if (a.trim()) s.add(a);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'nl'));
  }, [models]);

  const groupingTypes = useMemo(() => {
    if (groupings.length) {
      const bySlug = new Map(groupings.map((g) => [g.slug, g]));
      const preferred = isAdmin
        ? ['newface', 'tryout', 'high-class', 'inactief', 'verwijderd']
        : ['newface', 'tryout', 'high-class'];
      const rest = groupings
        .filter((g) => !preferred.includes(g.slug))
        .sort((a, b) => a.label.localeCompare(b.label, 'nl'));
      const ordered = [
        ...preferred.map((slug) => bySlug.get(slug)).filter(Boolean),
        ...rest,
      ] as { slug: string; label: string }[];
      return ordered.map((g) => ({ slug: g.slug, label: g.label || groupingLabel(g.slug) }));
    }
    const extra = new Set<string>(['newface', 'tryout', 'high-class']);
    if (isAdmin) {
      extra.add('inactief');
      extra.add('verwijderd');
    }
    for (const m of models) {
      for (const s of m.roleSlugs ?? []) {
        if (!HIDDEN_TYPE_SLUGS.has(s)) extra.add(s);
      }
      if (m.isHighClass) extra.add('high-class');
    }
    const preferred = isAdmin
      ? ['newface', 'tryout', 'high-class', 'inactief', 'verwijderd']
      : ['newface', 'tryout', 'high-class'];
    const rest = [...extra].filter((s) => !preferred.includes(s)).sort((a, b) => a.localeCompare(b, 'nl'));
    return [...preferred.filter((s) => extra.has(s)), ...rest].map((slug) => ({
      slug,
      label: groupingLabel(slug),
    }));
  }, [models, isAdmin, groupings]);

  const toggleSet = (setter: typeof setAvSel, key: string) => {
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const filtered = useMemo(() => {
    const ageActive = ageMin > catalogAge.lo || ageMax < catalogAge.hi;
    const needle = q.trim().toLowerCase();

    return models.filter((m) => {
      const wantsDeleted = flagSel.has('verwijderd');
      if (m.isDeleted) {
        if (!isAdmin || !wantsDeleted) return false;
      } else if (wantsDeleted) {
        return false;
      }
      const wantsInactive = flagSel.has('inactief');
      if (!m.isDeleted) {
        if (m.isInactive) {
          if (!isAdmin || !wantsInactive) return false;
        } else if (wantsInactive) {
          return false;
        }
      }
      const typeFlags = [...flagSel].filter((f) => f !== 'inactief' && f !== 'verwijderd');
      if (typeFlags.length) {
        const slugs = new Set(m.roleSlugs ?? []);
        if (m.isNewface) slugs.add('newface');
        if (m.isTryout) slugs.add('tryout');
        if (m.isHighClass) slugs.add('high-class');
        for (const f of typeFlags) {
          if (!slugs.has(f)) return false;
        }
      }
      if (avSel.size) {
        const slugs = m.beschikbaarSlugs?.length
          ? m.beschikbaarSlugs
          : (m.beschikbaar ?? []).map(availSlug);
        if (!slugs.some((x) => avSel.has(x))) return false;
      }
      if (genderSel.size) {
        if (!m.gender || !genderSel.has(m.gender)) return false;
      }
      if (ageActive) {
        if (m.age == null || m.age < ageMin || m.age > ageMax) return false;
      }
      if (needle) {
        const name =
          `${m.displayName} ${m.firstName ?? ''} ${m.lastName ?? ''} ${m.gemeente ?? ''}`.toLowerCase();
        if (!name.includes(needle)) return false;
      }
      return true;
    });
  }, [models, avSel, genderSel, flagSel, ageMin, ageMax, catalogAge.lo, catalogAge.hi, q, isAdmin]);

  const onAgeMin = (raw: number) => {
    const v = Math.min(Math.max(AGE_TRACK_LO, raw), ageMax);
    setAgeMin(v);
  };
  const onAgeMax = (raw: number) => {
    const v = Math.max(Math.min(AGE_TRACK_HI, raw), ageMin);
    setAgeMax(v);
  };
  const ageSpan = AGE_TRACK_HI - AGE_TRACK_LO;
  const ageLeftPct = ((ageMin - AGE_TRACK_LO) / ageSpan) * 100;
  const ageRightPct = ((ageMax - AGE_TRACK_LO) / ageSpan) * 100;

  const openAsModel = async (m: CatalogModel) => {
    if (!token || !user?.email || !canImpersonate) return;
    try {
      startImpersonationSession(token, user.email);
      const res = await apiFetch<{ access_token: string }>('/auth/impersonate', {
        method: 'POST',
        token,
        body: JSON.stringify({ targetUserId: m.id }),
      });
      await applySessionToken(res.access_token);
      setModal(null);
      router.push('/modellen?tab=profiel');
    } catch (err) {
      clearImpersonationSession();
      window.alert(err instanceof Error ? err.message : 'Openen als model mislukt.');
    }
  };

  const modalPhoto = modal?.profileThumbKey ? publicMediaUrl(modal.profileThumbKey) : '';

  return (
    <div>
      <h2 className="nieuw-models-page-title">{title}</h2>

      <div className="nieuw-models-toolbar">
        <span className="nieuw-models-toolbar-label">Zoeken &amp; filteren</span>
        {!loading && !error ? (
          <span className="nieuw-models-count">
            {filtered.length} model{filtered.length === 1 ? '' : 'len'}
          </span>
        ) : null}
      </div>

      <div className="nieuw-models-layout">
        <aside className="nieuw-models-filters" aria-label="Zoekfilters">
          <label className="nieuw-models-field">
            <span>Naam of gemeente</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoeken…"
            />
          </label>

          <div className="nieuw-models-field">
            <span>Geslacht</span>
            <div className="nieuw-models-checks">
              {(['vrouw', 'man'] as const).map((g) => (
                <label key={g}>
                  <input
                    type="checkbox"
                    checked={genderSel.has(g)}
                    onChange={() => toggleSet(setGenderSel, g)}
                  />
                  {g === 'vrouw' ? 'Vrouw' : 'Man'}
                </label>
              ))}
            </div>
          </div>

          <div className="nieuw-models-field">
            <span>Leeftijd</span>
            <div className="nieuw-models-age-range">
              <div className="nieuw-models-age-values">
                <span>{ageMin} j.</span>
                <span>{ageMax} j.</span>
              </div>
              <div
                className="nieuw-models-age-slider"
                style={{
                  ['--age-left' as string]: `${ageLeftPct}%`,
                  ['--age-right' as string]: `${ageRightPct}%`,
                }}
              >
                <div className="nieuw-models-age-track" aria-hidden />
                <div className="nieuw-models-age-fill" aria-hidden />
                <input
                  type="range"
                  min={AGE_TRACK_LO}
                  max={AGE_TRACK_HI}
                  step={1}
                  value={ageMin}
                  aria-label="Minimumleeftijd"
                  onChange={(e) => onAgeMin(Number(e.target.value))}
                />
                <input
                  type="range"
                  min={AGE_TRACK_LO}
                  max={AGE_TRACK_HI}
                  step={1}
                  value={ageMax}
                  aria-label="Maximumleeftijd"
                  onChange={(e) => onAgeMax(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="nieuw-models-field">
            <span>Type</span>
            <div className="nieuw-models-checks">
              {groupingTypes.map((g) => (
                <label key={g.slug}>
                  <input
                    type="checkbox"
                    checked={flagSel.has(g.slug)}
                    onChange={() => toggleSet(setFlagSel, g.slug)}
                  />
                  {g.label}
                </label>
              ))}
            </div>
          </div>

          {allAvail.length ? (
            <div className="nieuw-models-field">
              <span>Beschikbaar voor</span>
              <div className="nieuw-models-checks">
                {allAvail.map((av) => {
                  const slug = availSlug(av);
                  return (
                    <label key={av}>
                      <input
                        type="checkbox"
                        checked={avSel.has(slug)}
                        onChange={() => toggleSet(setAvSel, slug)}
                      />
                      {av}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className="nieuw-btn nieuw-btn-ghost"
            style={{ width: '100%' }}
            onClick={() => {
              setAvSel(new Set());
              setGenderSel(new Set());
              setFlagSel(new Set());
              setAgeMin(catalogAge.lo);
              setAgeMax(catalogAge.hi);
              setQ('');
            }}
          >
            Filters wissen
          </button>
        </aside>

        <div className="nieuw-models-main">
          {loading ? <p className="nieuw-lead">Modellen laden…</p> : null}
          {error ? (
            <p className="nieuw-lead" style={{ color: '#d4a0a0' }}>
              {error}
            </p>
          ) : null}

          {!loading && !error ? (
            <>
              <div className="nieuw-models">
                {filtered.map((m, idx) => {
                  const src = m.profileThumbKey ? publicMediaUrl(m.profileThumbKey) : null;
                  const meta = [m.age != null ? `${m.age} j.` : null, m.gemeente || null]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <div key={m.id}>
                      <button
                        type="button"
                        className="nieuw-model"
                        onClick={() => setModal(m)}
                      >
                        <div className="nieuw-model-foto">
                          {m.isInactive ? <span className="nieuw-model-inactive-badge">Inactief</span> : null}
                          {src ? (
                            <CatalogModelThumb
                              key={`${src}-${idx < 8 ? 'p' : 'l'}`}
                              src={src}
                              alt={m.displayName}
                              priority={idx < 12}
                              className="nieuw-model-thumb"
                            />
                          ) : (
                            <div className="nieuw-model-placeholder">
                              {(m.displayName || '?').slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="nieuw-model-meta">
                          <h4>{m.displayName}</h4>
                          <p>
                            {meta ||
                              (m.gender === 'man' ? 'Man' : m.gender === 'vrouw' ? 'Vrouw' : 'Profiel')}
                          </p>
                        </div>
                      </button>
                      {canImpersonate ? (
                        <button
                          type="button"
                          className="nieuw-btn nieuw-btn-ghost"
                          style={{ width: '100%', marginTop: 6, fontSize: 9, padding: '8px 10px' }}
                          onClick={() => void openAsModel(m)}
                        >
                          Als model
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {filtered.length === 0 ? (
                <p className="nieuw-lead" style={{ marginTop: 20 }}>
                  Geen modellen gevonden voor deze filter.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {modal ? (
        <ModelDetailDialog
          m={modal}
          initialPhotoSrc={modalPhoto}
          isAdmin={isAdmin}
          token={token}
          theme="dark"
          onClose={() => setModal(null)}
          onUpdated={(patch) => {
            setModels((prev) => prev.map((x) => (x.id === patch.id ? { ...x, ...patch } : x)));
            setModal((cur) => (cur && cur.id === patch.id ? { ...cur, ...patch } : cur));
          }}
          onDeleted={(id) => {
            setModels((prev) => prev.filter((x) => x.id !== id));
            setModal(null);
          }}
        />
      ) : null}
    </div>
  );
}
