'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import {
  CARD_MODEL_WORDEN,
  DOELGROEPEN_CARDS,
  DOELGROEPEN_INTRO,
  GUEST_MENU,
  MODEL_WORDEN_EXTRA_CHECKLIST,
  MODEL_WORDEN_STATS,
  WAAROM_CHECKLIST,
  WAAROM_PARAGRAPHS,
  type GuestMenuId,
} from '@/components/guest-portal/guest-portal-data';

function CheckDisc() {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white"
      aria-hidden
    >
      ✓
    </span>
  );
}

type ContentCardProps = {
  kicker: string;
  title: string;
  bullets: readonly string[];
  cta: string;
  onCta?: () => void;
};

function ContentCard({ kicker, title, bullets, cta, onCta }: ContentCardProps) {
  return (
    <article className="rounded-cm border border-line bg-white px-5 py-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink">{kicker}</p>
      <h3 className="mt-2 font-serif text-xl font-semibold text-ink">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink/90">
        {bullets.map((b) => (
          <li key={b} className="flex gap-3">
            <CheckDisc />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onCta}
        className="mt-5 w-full rounded-cm bg-ink py-3 text-center text-sm font-semibold text-white hover:bg-ink/90 md:w-auto md:px-10"
      >
        {cta}
      </button>
    </article>
  );
}

function SectionBlock({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-cm border border-line bg-white px-5 py-5 shadow-sm ${className}`}>{children}</div>
  );
}

export function GuestPortalLayout() {
  const [active, setActive] = useState<GuestMenuId>('model-worden');

  const goMenu = useCallback((id: GuestMenuId) => setActive(id), []);

  const menuLabel = GUEST_MENU.find((m) => m.id === active)?.label ?? '';

  const ctaFor = (target: GuestMenuId) => () => goMenu(target);

  const renderModelWorden = () => (
    <div className="space-y-5">
      {CARD_MODEL_WORDEN.map((c, i) => (
        <ContentCard
          key={i}
          kicker={c.kicker}
          title={c.title}
          bullets={c.bullets}
          cta={c.cta}
          onCta={
            i === 0
              ? ctaFor('gratis-fotoshoot')
              : i === 1
                ? ctaFor('casting')
                : ctaFor('intake-gesprek')
          }
        />
      ))}

      <SectionBlock>
        <ul className="space-y-3">
          {MODEL_WORDEN_EXTRA_CHECKLIST.map((line) => (
            <li key={line} className="flex gap-3 text-sm leading-relaxed text-ink/90">
              <CheckDisc />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </SectionBlock>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        {MODEL_WORDEN_STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-cm border border-line bg-white px-4 py-4 text-center shadow-sm"
          >
            <p className="font-serif text-2xl font-bold text-ink">{s.value}</p>
            <p className="mt-1 text-xs font-semibold text-ink">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-cm border border-line bg-panel px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-ink">Klaar om de eerste stap te zetten?</h3>
          <p className="mt-1 text-sm text-muted">
            Kies wat het best bij jou past: gratis testshoot, casting of intakegesprek.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={ctaFor('gratis-fotoshoot')}
            className="rounded-cm bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/90"
          >
            Gratis fotoshoot
          </button>
          <button
            type="button"
            onClick={ctaFor('casting')}
            className="rounded-cm border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-panel"
          >
            Casting
          </button>
          <button
            type="button"
            onClick={ctaFor('intake-gesprek')}
            className="rounded-cm border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-panel"
          >
            Intake
          </button>
        </div>
      </div>
    </div>
  );

  const renderDoelgroepen = () => (
    <div className="space-y-5">
      <SectionBlock>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink">WAAROM CLASS-MODELS</p>
        <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">Iedereen verdient het om te schitteren</h3>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          {WAAROM_PARAGRAPHS.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <ul className="mt-5 space-y-3">
          {WAAROM_CHECKLIST.map((line) => (
            <li key={line} className="flex gap-3 text-sm leading-relaxed text-ink/90">
              <CheckDisc />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink">DOELGROEPEN</p>
        <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">Voor wie?</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">{DOELGROEPEN_INTRO}</p>
        <div className="mt-5 space-y-3">
          {DOELGROEPEN_CARDS.map((c) => (
            <div key={c.title} className="rounded-cm border border-line bg-panel px-4 py-3">
              <p className="font-serif text-base font-semibold text-ink">{c.title}</p>
              <p className="mt-1 text-sm text-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );

  const renderVeelgesteldeVragen = () => (
    <SectionBlock>
      <p className="text-sm leading-relaxed text-ink/90">
        Antwoorden op veelgestelde vragen worden hier binnenkort toegevoegd. Tot die tijd kan je ons contacteren via
        het menu <strong>Contact</strong> of terugkeren naar de beginpagina om in te loggen.
      </p>
    </SectionBlock>
  );

  const renderContact = () => (
    <SectionBlock>
      <h3 className="font-serif text-xl font-semibold text-ink">Contact</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Heb je vragen over model worden, castings of samenwerking met Class-Models? Neem gerust contact op met het
        bureau. Vermeld kort je vraag en hoe we je het best bereiken.
      </p>
      <p className="mt-4 text-sm text-ink/90">
        Je kan ook terug naar de <Link href="/" className="font-medium text-burgundy underline underline-offset-2">beginpagina</Link> om in te loggen of een account te openen.
      </p>
    </SectionBlock>
  );

  const singleCard = (index: 0 | 1 | 2) => {
    const c = CARD_MODEL_WORDEN[index];
    return (
      <ContentCard kicker={c.kicker} title={c.title} bullets={c.bullets} cta={c.cta} />
    );
  };

  const mainContent = () => {
    switch (active) {
      case 'model-worden':
        return renderModelWorden();
      case 'gratis-fotoshoot':
      case 'testshoot':
        return <div className="space-y-5">{singleCard(0)}</div>;
      case 'casting':
        return <div className="space-y-5">{singleCard(1)}</div>;
      case 'intake-gesprek':
        return <div className="space-y-5">{singleCard(2)}</div>;
      case 'doelgroepen':
        return renderDoelgroepen();
      case 'veelgestelde-vragen':
        return renderVeelgesteldeVragen();
      case 'contact':
        return renderContact();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-panel text-ink">
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link
            href="/"
            className="text-sm font-medium text-burgundy underline-offset-2 hover:underline"
          >
            ← Terug naar beginpagina (inloggen)
          </Link>
          <span className="text-xs text-muted">Gastenportaal — geen account nodig om te lezen</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[min(280px,32%)_1fr] lg:items-start">
          <aside className="overflow-hidden rounded-cm border border-line bg-white shadow-sm lg:sticky lg:top-4">
            <div className="border-b border-line bg-burgundy px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-white">
              Gast menu
            </div>
            <nav className="divide-y divide-line" aria-label="Gastenmenu">
              {GUEST_MENU.map((item) => {
                const isActive = item.id === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goMenu(item.id)}
                    className={`flex w-full items-center justify-between gap-2 py-3 pr-3 text-left text-sm font-medium transition ${
                      isActive
                        ? 'border-l-4 border-l-burgundy bg-panel pl-[calc(0.75rem-3px)] text-ink'
                        : 'border-l-4 border-l-transparent pl-3 text-ink hover:bg-panel/70'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-muted" aria-hidden>
                      ›
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 overflow-hidden rounded-cm border border-line bg-white shadow-sm">
            <div className="border-b border-line bg-burgundy px-4 py-2.5 text-sm font-semibold text-white">
              {menuLabel}
            </div>
            <div className="p-4 md:p-6">{mainContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
