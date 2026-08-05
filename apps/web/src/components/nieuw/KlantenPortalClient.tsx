'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiFetch, getApiBase, publicMediaUrl } from '@/lib/api';
import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';
import { PartnersStrip } from '@/components/PartnersStrip';
import { useIsMobile } from '@/lib/use-is-mobile';
import { ModellenBoekenPanel } from '@/components/klanten-portal/ModellenBoekenPanel';
import { KlantenWaarStaatContent } from '@/components/klanten-portal/content-waar-staat';
import { KlantenWatBiedenContent } from '@/components/klanten-portal/content-wat-bieden';
import { KlantenEventContent } from '@/components/klanten-portal/content-event';

export type KlantenTabId =
  | 'waar-staat'
  | 'wat-bieden'
  | 'modellen-boeken'
  | 'event'
  | 'modellen'
  | 'gekozen'
  | 'aanvraag'
  | 'aanvragen';

export function parseKlantenTab(raw: string | null): KlantenTabId {
  if (
    raw === 'wat-bieden' ||
    raw === 'modellen-boeken' ||
    raw === 'event' ||
    raw === 'modellen' ||
    raw === 'gekozen' ||
    raw === 'aanvraag' ||
    raw === 'aanvragen' ||
    raw === 'tarieven' // oude link → modellen-boeken
  ) {
    if (raw === 'tarieven') return 'modellen-boeken';
    return raw;
  }
  return 'waar-staat';
}

function shortlistKey(userId: string) {
  return `cm-klant-shortlist:${userId}`;
}

function loadShortlist(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(shortlistKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveShortlist(userId: string, ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(shortlistKey(userId), JSON.stringify(ids));
}

type BriefRow = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  _count?: { responses: number };
};

function GuestLanding() {
  const isMobile = useIsMobile() === true;
  const loginHref = isMobile ? '/?m=client' : '/inloggen';
  const registerHref = '/klanten/registreren';

  return (
    <>
      <section className="nieuw-hero nieuw-hero-compact">
        <div className="nieuw-wrap nieuw-hero-grid">
          <div>
            <span className="nieuw-label">Voor merken &amp; bedrijven</span>
            <h1 className="nieuw-display">
              Modellen
              <br />
              <em>boeken</em>
            </h1>
            <p className="nieuw-lead nieuw-hero-lead">
              Class-Models levert casting en boekingen voor campagnes, reclame, events, modeshows en
              productshoots. Duidelijke selectie, snelle shortlists en professionele opvolging.
            </p>
            <div className="nieuw-hero-actions">
              <Link className="nieuw-btn" href={loginHref}>
                Inloggen
              </Link>
              <Link className="nieuw-btn nieuw-btn-ghost" href={registerHref}>
                Account aanmaken
              </Link>
            </div>
            <ul className="nieuw-klant-can-do" aria-label="Wat u kunt doen na inloggen">
              <li>Info over Class-Models en ons aanbod</li>
              <li>Tarieven berekenen en offerte / bestelling aanvragen</li>
              <li>Alle modellen selecteren voor uw shortlist</li>
              <li>Een castingaanvraag versturen</li>
            </ul>
          </div>
          <aside className="nieuw-hero-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nieuw/klantenportaal.jpg"
              alt="Klantenoverleg bij Class-Models"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              width={800}
              height={600}
            />
            <div className="nieuw-hero-card-body">
              <h2>Wat u krijgt</h2>
              <ul>
                <li>Gerichte shortlist op look &amp; beschikbaarheid</li>
                <li>Heldere fiches per model</li>
                <li>Ondersteuning tot op de set</li>
                <li>Backup-opties bij uitval</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
      <PartnersStrip />
    </>
  );
}

function ModelCard({
  m,
  selected,
  onToggle,
}: {
  m: CatalogModel;
  selected: boolean;
  onToggle: () => void;
}) {
  const src = m.profileThumbKey ? publicMediaUrl(m.profileThumbKey) : null;
  const meta = [
    m.gender === 'man' ? 'Man' : m.gender === 'vrouw' ? 'Vrouw' : null,
    m.age != null ? `${m.age} j.` : null,
    m.gemeente || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      className={`nieuw-model${selected ? ' selected' : ''}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <div className="nieuw-model-foto">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={m.displayName}
            loading="lazy"
            decoding="async"
            width={360}
            height={480}
          />
        ) : (
          <div className="nieuw-model-placeholder">
            {(m.displayName || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        {selected ? <span className="nieuw-model-badge">Gekozen</span> : null}
      </div>
      <div className="nieuw-model-meta">
        <h4>{m.displayName}</h4>
        <p>{meta || 'Profiel'}</p>
      </div>
    </button>
  );
}

export function KlantenPortalClient() {
  const { user, token, loading, can, logout } = useAuth();
  const searchParams = useSearchParams();
  const tab = parseKlantenTab(searchParams.get('tab'));

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
    project: '',
    date: '',
    notes: '',
  });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [briefsLoading, setBriefsLoading] = useState(false);

  const isClient = Boolean(user?.roles?.includes('client'));
  const isAdmin = Boolean(
    user?.roles?.includes('admin') ||
      can('*') ||
      user?.permissions?.some((p) => p.startsWith('admin.')),
  );
  const canEnter = Boolean(user && (isClient || isAdmin));
  const canSubmitCasting = Boolean(user && token && canEnter);

  useEffect(() => {
    if (!user?.id) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(loadShortlist(user.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      company: f.company || user.companyName || '',
      contact: f.contact || [user.firstName, user.lastName].filter(Boolean).join(' '),
      email: f.email || user.email || '',
      phone: f.phone || user.phone || '',
    }));
  }, [user]);

  const needsModels = canEnter && (tab === 'modellen' || tab === 'gekozen' || tab === 'aanvraag');

  useEffect(() => {
    if (!needsModels) return;
    let cancelled = false;
    setModelsLoading(true);
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
        setModelsError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setModelsError(e instanceof Error ? e.message : 'Laden mislukt.');
        setModels([]);
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsModels, token]);

  useEffect(() => {
    if (!canEnter || !token || tab !== 'aanvragen') return;
    let cancelled = false;
    setBriefsLoading(true);
    apiFetch<BriefRow[]>('/portal/client/briefs', { token })
      .then((rows) => {
        if (!cancelled) setBriefs(rows);
      })
      .catch(() => {
        if (!cancelled) setBriefs([]);
      })
      .finally(() => {
        if (!cancelled) setBriefsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canEnter, token, tab]);

  const toggleSelected = useCallback(
    (id: string) => {
      if (!user?.id) return;
      setSelectedIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        saveShortlist(user.id, next);
        return next;
      });
    },
    [user?.id],
  );

  const selectedModels = useMemo(() => {
    const map = new Map(models.map((m) => [m.id, m]));
    return selectedIds.map((id) => map.get(id)).filter((m): m is CatalogModel => Boolean(m));
  }, [models, selectedIds]);

  const filteredModels = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return models.filter((m) => {
      if (m.isInactive && !isAdmin) return false;
      if (!needle) return true;
      const name =
        `${m.displayName} ${m.firstName ?? ''} ${m.lastName ?? ''} ${m.gemeente ?? ''}`.toLowerCase();
      return name.includes(needle);
    });
  }, [models, q, isAdmin]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!user || !token) return;
    if (!canSubmitCasting) {
      setSubmitError('Castingaanvragen zijn beschikbaar voor klantenaccounts.');
      return;
    }
    setBusy(true);
    try {
      const title = form.project.trim() || 'Castingaanvraag';
      const shortlistNames = selectedModels.map((m) => m.displayName);
      const bodyParts = [
        `Bedrijf: ${form.company.trim()}`,
        `Contactpersoon: ${form.contact.trim()}`,
        `E-mail: ${form.email.trim()}`,
        form.phone.trim() ? `Telefoon: ${form.phone.trim()}` : null,
        `Project: ${form.project.trim()}`,
        form.date.trim() ? `Gewenste datum / periode: ${form.date.trim()}` : null,
        form.notes.trim() ? `Extra info: ${form.notes.trim()}` : null,
        shortlistNames.length ? `Shortlist: ${shortlistNames.join(', ')}` : null,
        selectedIds.length ? `Model-IDs: ${selectedIds.join(', ')}` : null,
      ].filter(Boolean);
      await apiFetch('/portal/client/briefs', {
        method: 'POST',
        token,
        body: JSON.stringify({ title, body: bodyParts.join('\n') }),
      });
      setSent(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Verzenden mislukt.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="nieuw-uc" style={{ background: 'var(--n-bg)', minHeight: '40vh' }}>
        <p className="nieuw-lead">Laden…</p>
      </section>
    );
  }

  if (!user) {
    return <GuestLanding />;
  }

  if (!canEnter) {
    return (
      <section className="nieuw-sectie" style={{ paddingTop: 36, paddingBottom: 60 }}>
        <div className="nieuw-wrap" style={{ maxWidth: 560 }}>
          <span className="nieuw-label">Klantenportaal</span>
          <h1 className="nieuw-display" style={{ marginTop: 4, fontSize: 'clamp(28px, 4vw, 44px)' }}>
            Geen <em>toegang</em>
          </h1>
          <p className="nieuw-lead">
            Dit portaal is bestemd voor klantenaccounts. U bent momenteel met een ander type account
            ingelogd.
          </p>
          <div className="nieuw-hero-actions" style={{ marginTop: 24 }}>
            <Link className="nieuw-btn" href="/">
              Naar home
            </Link>
            <button type="button" className="nieuw-btn nieuw-btn-ghost" onClick={() => void logout()}>
              Uitloggen
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (tab === 'wat-bieden') {
    return (
      <section className="nieuw-sectie" style={{ paddingTop: 28, paddingBottom: 80 }}>
        <div className="nieuw-wrap">
          <KlantenWatBiedenContent />
        </div>
      </section>
    );
  }

  if (tab === 'modellen-boeken') {
    return (
      <section className="nieuw-sectie" style={{ paddingTop: 28, paddingBottom: 80 }}>
        <div className="nieuw-wrap">
          <ModellenBoekenPanel token={token || ''} />
          <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link className="nieuw-btn nieuw-btn-ghost" href="/klanten?tab=modellen">
              Modellen kiezen in catalogus
            </Link>
            <Link className="nieuw-btn nieuw-btn-ghost" href="/klanten?tab=aanvraag">
              Castingaanvraag met shortlist
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (tab === 'event') {
    return (
      <section className="nieuw-sectie" style={{ paddingTop: 28, paddingBottom: 80 }}>
        <div className="nieuw-wrap">
          <KlantenEventContent />
        </div>
      </section>
    );
  }

  if (tab === 'modellen') {
    return (
      <section className="nieuw-sectie" style={{ paddingTop: 36, paddingBottom: 80 }}>
        <div className="nieuw-wrap">
          <span className="nieuw-label">Selectie</span>
          <h2 className="nieuw-display nieuw-display-md">
            Alle <em>modellen</em>
          </h2>
          <p className="nieuw-lead">
            Klik op een model om het te kiezen. Gekozen modellen verschijnen onder Gekozen.
          </p>
          <div className="nieuw-klant-models-toolbar">
            <label className="nieuw-models-field" style={{ margin: 0, flex: 1, maxWidth: 360 }}>
              <span>Zoeken</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Naam of gemeente…"
              />
            </label>
            <Link className="nieuw-btn nieuw-btn-ghost" href="/klanten?tab=gekozen">
              Gekozen ({selectedIds.length})
            </Link>
          </div>
          {modelsLoading ? <p className="nieuw-lead">Modellen laden…</p> : null}
          {modelsError ? (
            <p className="nieuw-lead" style={{ color: '#d4a0a0' }}>
              {modelsError}
            </p>
          ) : null}
          {!modelsLoading && !modelsError ? (
            <>
              <p className="nieuw-lead" style={{ marginTop: 8 }}>
                {filteredModels.length} model{filteredModels.length === 1 ? '' : 'len'}
                {selectedIds.length ? ` · ${selectedIds.length} gekozen` : ''}
              </p>
              <div className="nieuw-models" style={{ marginTop: 18 }}>
                {filteredModels.map((m) => (
                  <ModelCard
                    key={m.id}
                    m={m}
                    selected={selectedIds.includes(m.id)}
                    onToggle={() => toggleSelected(m.id)}
                  />
                ))}
              </div>
              {filteredModels.length === 0 ? (
                <p className="nieuw-lead" style={{ marginTop: 20 }}>
                  Geen modellen gevonden.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    );
  }

  if (tab === 'gekozen') {
    return (
      <section className="nieuw-sectie" style={{ paddingTop: 36, paddingBottom: 80 }}>
        <div className="nieuw-wrap">
          <span className="nieuw-label">Shortlist</span>
          <h2 className="nieuw-display nieuw-display-md">
            Gekozen <em>modellen</em>
          </h2>
          <p className="nieuw-lead">
            Dit zijn de modellen die u heeft aangevinkt. U kunt ze hier verwijderen of meenemen in
            uw castingaanvraag.
          </p>
          <div className="nieuw-hero-actions" style={{ marginTop: 20 }}>
            <Link className="nieuw-btn" href="/klanten?tab=modellen">
              Meer modellen kiezen
            </Link>
            <Link className="nieuw-btn nieuw-btn-ghost" href="/klanten?tab=aanvraag">
              Casting aanvragen
            </Link>
          </div>
          {modelsLoading ? <p className="nieuw-lead">Laden…</p> : null}
          {!modelsLoading && selectedIds.length === 0 ? (
            <div className="nieuw-panel" style={{ marginTop: 28, textAlign: 'center' }}>
              <p className="nieuw-lead" style={{ margin: 0, textAlign: 'center' }}>
                Nog geen modellen gekozen.
              </p>
              <div style={{ marginTop: 20 }}>
                <Link className="nieuw-btn" href="/klanten?tab=modellen">
                  Naar modellen
                </Link>
              </div>
            </div>
          ) : null}
          {!modelsLoading && selectedModels.length > 0 ? (
            <div className="nieuw-models" style={{ marginTop: 28 }}>
              {selectedModels.map((m) => (
                <ModelCard
                  key={m.id}
                  m={m}
                  selected
                  onToggle={() => toggleSelected(m.id)}
                />
              ))}
            </div>
          ) : null}
          {!modelsLoading && selectedIds.length > 0 && selectedModels.length === 0 ? (
            <p className="nieuw-lead" style={{ marginTop: 24 }}>
              Uw selectie is bewaard ({selectedIds.length}), maar de modelgegevens konden niet
              geladen worden. Probeer later opnieuw.
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  if (tab === 'aanvraag') {
    return (
      <section className="nieuw-sectie" style={{ paddingTop: 36, paddingBottom: 80 }}>
        <div className="nieuw-wrap" style={{ maxWidth: 760 }}>
          <span className="nieuw-label">Aanvraag</span>
          <h2 className="nieuw-display nieuw-display-md">
            Casting <em>aanvragen</em>
          </h2>
          <p className="nieuw-lead">
            Shortlist: {selectedModels.length ? selectedModels.map((m) => m.displayName).join(', ') : 'nog geen selectie'}{' '}
            ·{' '}
            <Link className="nieuw-link" href="/klanten?tab=modellen">
              Modellen kiezen
            </Link>
          </p>
          {sent ? (
            <div className="nieuw-panel" style={{ marginTop: 24, borderColor: 'var(--n-gold-hair)' }}>
              <h3 className="nieuw-h3">Aanvraag ontvangen</h3>
              <p className="nieuw-lead">Bedankt. We hebben uw aanvraag ontvangen.</p>
              <div className="nieuw-hero-actions" style={{ marginTop: 18 }}>
                <Link className="nieuw-btn" href="/klanten?tab=aanvragen">
                  Mijn aanvragen
                </Link>
                <Link className="nieuw-btn nieuw-btn-ghost" href="/klanten">
                  Naar home
                </Link>
              </div>
            </div>
          ) : (
            <form className="nieuw-panel" style={{ marginTop: 24 }} onSubmit={(e) => void onSubmit(e)}>
              <div className="nieuw-form-grid">
                <label className="nieuw-field">
                  <span>Bedrijf</span>
                  <input
                    required
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </label>
                <label className="nieuw-field">
                  <span>Contactpersoon</span>
                  <input
                    required
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  />
                </label>
                <label className="nieuw-field">
                  <span>E-mail</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <label className="nieuw-field">
                  <span>Telefoon</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </label>
                <label className="nieuw-field nieuw-field-full">
                  <span>Project / titel</span>
                  <input
                    required
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                    placeholder="bv. Zomer campagne 2026"
                  />
                </label>
                <label className="nieuw-field">
                  <span>Gewenste datum / periode</span>
                  <input
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <label className="nieuw-field nieuw-field-full">
                  <span>Extra info / look</span>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Doelgroep, sfeer, aantal modellen, locatie…"
                  />
                </label>
              </div>
              {submitError ? (
                <p style={{ color: '#e8a0a0', fontSize: 13, margin: '14px 0 0' }}>{submitError}</p>
              ) : null}
              <button className="nieuw-btn" type="submit" disabled={busy} style={{ marginTop: 20 }}>
                {busy ? 'Bezig…' : 'Verstuur castingaanvraag →'}
              </button>
            </form>
          )}
        </div>
      </section>
    );
  }

  if (tab === 'aanvragen') {
    return (
      <section className="nieuw-sectie" style={{ paddingTop: 36, paddingBottom: 80 }}>
        <div className="nieuw-wrap" style={{ maxWidth: 760 }}>
          <span className="nieuw-label">Overzicht</span>
          <h2 className="nieuw-display nieuw-display-md">
            Mijn <em>aanvragen</em>
          </h2>
          <p className="nieuw-lead">Uw eerdere castingaanvragen bij Class-Models.</p>
          {briefsLoading ? <p className="nieuw-lead">Laden…</p> : null}
          {!briefsLoading && briefs.length === 0 ? (
            <div className="nieuw-panel" style={{ marginTop: 24, textAlign: 'center' }}>
              <p className="nieuw-lead" style={{ margin: 0, textAlign: 'center' }}>
                Nog geen aanvragen.
              </p>
              <div style={{ marginTop: 20 }}>
                <Link className="nieuw-btn" href="/klanten?tab=aanvraag">
                  Nieuwe aanvraag
                </Link>
              </div>
            </div>
          ) : null}
          <ul className="nieuw-klant-briefs">
            {briefs.map((b) => (
              <li key={b.id} className="nieuw-panel">
                <div className="nieuw-klant-brief-head">
                  <h3 className="nieuw-h3">{b.title}</h3>
                  <span className="nieuw-klant-brief-status">{b.status}</span>
                </div>
                <p className="nieuw-lead" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>
                  {b.body.length > 280 ? `${b.body.slice(0, 280)}…` : b.body}
                </p>
                <p className="nieuw-lead" style={{ marginTop: 10, fontSize: 12 }}>
                  {new Intl.DateTimeFormat('nl-BE', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(b.createdAt))}
                  {b._count?.responses != null ? ` · ${b._count.responses} reactie(s)` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="nieuw-sectie" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <div className="nieuw-wrap">
        <KlantenWaarStaatContent />
        <div className="nieuw-hero-actions" style={{ marginTop: 28 }}>
          <Link className="nieuw-btn" href="/klanten?tab=modellen-boeken">
            Modellen boeken / tarieven
          </Link>
          <Link className="nieuw-btn nieuw-btn-ghost" href="/klanten?tab=modellen">
            Catalogus bekijken
          </Link>
        </div>
      </div>
      <PartnersStrip />
    </section>
  );
}
