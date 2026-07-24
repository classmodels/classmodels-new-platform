'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getApiBase, publicMediaUrl } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import {
  ModelDetailDialog,
  type CatalogModel,
} from '@/components/models-catalog/ModelsCatalogGrid';
import {
  clearImpersonationSession,
  startImpersonationSession,
} from '@/lib/impersonation';

function availSlug(label: string) {
  return label.toLowerCase().trim().replace(/\s+/g, '-');
}

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
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [q, setQ] = useState('');

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

  const allAvail = useMemo(() => {
    const s = new Set<string>();
    for (const m of models) {
      for (const a of m.beschikbaar ?? []) {
        if (a.trim()) s.add(a);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'nl'));
  }, [models]);

  const toggleSet = (setter: typeof setAvSel, key: string) => {
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const filtered = useMemo(() => {
    const amin = parseInt(ageMin, 10);
    const amax = parseInt(ageMax, 10);
    const needle = q.trim().toLowerCase();

    return models.filter((m) => {
      if (m.isInactive && !isAdmin) return false;
      if (flagSel.has('newface') && !m.isNewface) return false;
      if (flagSel.has('tryout') && !m.isTryout) return false;
      if (avSel.size) {
        const slugs = m.beschikbaarSlugs?.length
          ? m.beschikbaarSlugs
          : (m.beschikbaar ?? []).map(availSlug);
        if (!slugs.some((x) => avSel.has(x))) return false;
      }
      if (genderSel.size) {
        if (!m.gender || !genderSel.has(m.gender)) return false;
      }
      if (amin && (m.age == null || m.age < amin)) return false;
      if (amax && (m.age == null || m.age > amax)) return false;
      if (needle) {
        const name =
          `${m.displayName} ${m.firstName ?? ''} ${m.lastName ?? ''} ${m.gemeente ?? ''}`.toLowerCase();
        if (!name.includes(needle)) return false;
      }
      return true;
    });
  }, [models, avSel, genderSel, flagSel, ageMin, ageMax, q, isAdmin]);

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
      router.push('/nieuw/modellen?tab=profiel');
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
            <div className="nieuw-models-age">
              <input
                type="number"
                inputMode="numeric"
                placeholder="min"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
              />
              <span>–</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="max"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
              />
            </div>
          </div>

          <div className="nieuw-models-field">
            <span>Type</span>
            <div className="nieuw-models-checks">
              <label>
                <input
                  type="checkbox"
                  checked={flagSel.has('newface')}
                  onChange={() => toggleSet(setFlagSel, 'newface')}
                />
                New face
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={flagSel.has('tryout')}
                  onChange={() => toggleSet(setFlagSel, 'tryout')}
                />
                Try-out
              </label>
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
            style={{ width: '100%', marginTop: 8, fontSize: 10 }}
            onClick={() => {
              setAvSel(new Set());
              setGenderSel(new Set());
              setFlagSel(new Set());
              setAgeMin('');
              setAgeMax('');
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
                {filtered.map((m) => {
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
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt={m.displayName} />
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
        />
      ) : null}
    </div>
  );
}
