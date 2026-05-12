'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getApiBase } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { EntryAuthPanel, type EntryAuthTab } from '@/components/entry-auth-panel';
import { MODELLEN_HOME_NAV, type HomeContentCard, type HomeNavSection } from '@/components/modellen-home-nav';
import { ModelsCatalogGrid } from '@/components/models-catalog/ModelsCatalogGrid';

type ApiMenuBlock = {
  id: string;
  slug: string;
  label: string;
  items: { id: string; label: string; href: string }[];
};

function Chevron() {
  return (
    <span className="text-muted" aria-hidden>
      ›
    </span>
  );
}

function ContentStack({ cards }: { cards: HomeContentCard[] }) {
  if (!cards.length) return <p className="text-sm text-muted">Geen inhoud voor deze keuze.</p>;
  return (
    <div className="space-y-4">
      {cards.map((c, i) => (
        <article
          key={`${c.title}-${i}`}
          className="rounded-cm border border-line bg-white px-5 py-4 shadow-sm"
        >
          {c.kicker ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{c.kicker}</p>
          ) : null}
          <h3 className="mt-1 font-serif text-lg font-semibold text-ink">{c.title}</h3>
          {c.body ? <p className="mt-2 text-sm leading-relaxed text-ink/90">{c.body}</p> : null}
          {c.bullets?.length ? (
            <ul className="mt-3 space-y-2 text-sm text-ink/90">
              {c.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy" aria-hidden />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {c.ctaLabel ? (
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-ink py-2.5 text-center text-sm font-semibold text-white hover:bg-ink/90 md:w-auto md:px-8"
            >
              {c.ctaLabel}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function TrustStrip() {
  const items = [
    'Professionele begeleiding',
    'Eerlijke kansen',
    'Portfolio op maat',
    'Veelzijdige opdrachten',
    'Persoonlijk contact',
  ];
  return (
    <div className="mt-6 rounded-cm border border-line bg-panel px-4 py-3">
      <ul className="flex flex-col gap-2 text-xs text-ink md:flex-row md:flex-wrap md:items-center md:gap-x-6 md:gap-y-1">
        {items.map((t) => (
          <li key={t} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-burgundy" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ModellenHomePage() {
  const { token } = useAuth();
  const [apiLeftMenus, setApiLeftMenus] = useState<ApiMenuBlock[]>([]);

  const nav = MODELLEN_HOME_NAV;
  const [sectionId, setSectionId] = useState<string>(nav[0]?.id ?? 'rooster');
  const section = useMemo(
    () => nav.find((s) => s.id === sectionId) ?? nav[0],
    [nav, sectionId],
  );

  const firstPill = section?.pills?.[0]?.id ?? 'default';
  const [pillId, setPillId] = useState<string>(firstPill);
  const [authTab, setAuthTab] = useState<EntryAuthTab>('model');

  useEffect(() => {
    const pills = section?.pills;
    if (section?.kind === 'auth' && pills?.length) {
      const m = pills.find((p) => p.id === 'model');
      const next = m?.id ?? pills[0].id;
      setPillId(next);
      if (next === 'model' || next === 'guest' || next === 'client') setAuthTab(next);
      return;
    }
    if (pills?.length) setPillId(pills[0].id);
    else setPillId('default');
  }, [section]);

  useEffect(() => {
    const h = new Headers();
    if (token) h.set('Authorization', `Bearer ${token}`);
    fetch(`${getApiBase()}/menus/for/guest?placement=${encodeURIComponent('left')}`, { headers: h })
      .then(async (r) => {
        if (!r.ok) return [];
        const data: unknown = await r.json();
        if (!Array.isArray(data)) return [];
        return data.filter(
          (m): m is ApiMenuBlock =>
            m != null &&
            typeof m === 'object' &&
            'id' in m &&
            'items' in m &&
            Array.isArray((m as ApiMenuBlock).items),
        );
      })
      .then(setApiLeftMenus)
      .catch(() => setApiLeftMenus([]));
  }, [token]);

  const pillKey = section?.pills?.length ? pillId : 'default';
  const cards: HomeContentCard[] = section?.cardsByPill[pillKey] ?? section?.cardsByPill.default ?? [];
  const currentPillLabel = section?.pills?.find((p) => p.id === pillId)?.label;

  const onLeftSelect = (s: HomeNavSection) => {
    setSectionId(s.id);
    if (s.kind === 'auth' && s.pills?.length) {
      const first = s.pills[0].id;
      setPillId(first);
      if (first === 'model' || first === 'guest' || first === 'client') setAuthTab(first);
    }
  };

  const onPillClick = (id: string) => {
    setPillId(id);
    if (section?.kind === 'auth' && (id === 'model' || id === 'guest' || id === 'client')) {
      setAuthTab(id);
    }
  };

  const mainTitle = section ? (currentPillLabel ? `${section.label} — ${currentPillLabel}` : section.label) : '';

  return (
    <div className="min-h-[100dvh] bg-panel text-ink">
      {/* Bovenblok / hero — sitekleuren */}
      <div className="border-b border-line bg-gradient-to-br from-burgundy via-burgundyDeep to-burgundy text-white">
        <div className="mx-auto w-full max-w-page px-4 py-10 md:px-6 md:py-12">
          <div className="grid gap-8 md:grid-cols-[1fr_min(280px,36%)] md:items-center">
            <div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">Model worden begint hier</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90">
                Kies hoe je wilt starten: informatie over fotoshoot, casting of intake — of log direct in op het
                modellenplatform.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSectionId('model-worden');
                    setPillId('fotoshoot');
                  }}
                  className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20"
                >
                  Gratis fotoshoot
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSectionId('model-worden');
                    setPillId('casting');
                  }}
                  className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20"
                >
                  Casting
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSectionId('model-worden');
                    setPillId('intake');
                  }}
                  className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20"
                >
                  Intakegesprek
                </button>
              </div>
            </div>
            <div className="rounded-cm border border-white/20 bg-black/20 p-4 text-xs text-white/85 md:text-sm">
              <p className="font-medium text-white">Modellenplatform</p>
              <p className="mt-2 leading-relaxed">
                Navigeer links door de secties. Waar submenus zijn, verschijnen er knoppen in de titelbalk rechts om de
                inhoud eronder te wisselen — alles onder elkaar, strak en in lijn met Class-Models.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-page px-4 py-8 md:px-6 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          {/* Linkerkolom: balk + menu */}
          <aside className="overflow-hidden rounded-cm border border-line bg-white shadow-sm">
            <div className="border-b border-line bg-burgundy px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
              Modellenplatform
            </div>
            <nav className="divide-y divide-line" aria-label="Hoofdmenu home">
              {nav.map((s) => {
                const active = s.id === sectionId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onLeftSelect(s)}
                    className={`flex w-full items-center justify-between gap-2 py-3 pr-3 text-left text-sm font-medium transition ${
                      active
                        ? 'border-l-4 border-l-burgundy bg-panel pl-[calc(0.75rem-3px)] text-ink'
                        : 'border-l-4 border-l-transparent pl-3 text-ink hover:bg-panel/80'
                    }`}
                  >
                    <span>{s.label}</span>
                    <Chevron />
                  </button>
                );
              })}
              {apiLeftMenus.flatMap((m) =>
                m.items.map((it) => (
                  <Link
                    key={it.id}
                    href={it.href}
                    className="flex items-center justify-between gap-2 px-3 py-3 text-sm font-medium text-ink hover:bg-panel/80"
                  >
                    {it.label}
                    <Chevron />
                  </Link>
                )),
              )}
            </nav>
          </aside>

          {/* Rechterkolom: balk + titel + subbalk + inhoud */}
          <div className="min-w-0 overflow-hidden rounded-cm border border-line bg-white shadow-sm">
            <div className="border-b border-line bg-burgundy/95 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white">
              Inhoud
            </div>
            <div className="border-b border-line bg-panel px-4 py-3">
              <h2 className="font-serif text-xl font-semibold text-ink md:text-2xl">{mainTitle}</h2>
              {section?.pills?.length ? (
                <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Submenu">
                  {section.pills.map((p) => {
                    const active = p.id === pillId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onPillClick(p.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'border-burgundy bg-burgundy text-white shadow-sm'
                            : 'border-line bg-white text-ink hover:border-burgundy/35'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="p-4 md:p-6">
              {section?.kind === 'catalog' ? (
                <ModelsCatalogGrid />
              ) : section?.kind === 'auth' ? (
                <EntryAuthPanel activeTab={authTab} hidePortalTabs />
              ) : (
                <ContentStack cards={cards} />
              )}
              {section?.kind !== 'auth' && section?.kind !== 'catalog' ? <TrustStrip /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
