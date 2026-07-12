'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';

/**
 * Startpagina op de gsm (site én app): geen films of foto's, alleen de
 * nuttige content — snel boeken (gratis fotoshoot, casting, intake gesprek),
 * info en berichten. Donkere stijl met goudaccenten, zoals de nieuwe site.
 * De pc-versie (filmervaring) blijft volledig ongewijzigd.
 */

const GOLD = '#e9c780';
const GOLD_SOFT = 'rgba(233,199,128,0.55)';
const GOLD_LINE = 'rgba(233,199,128,0.28)';
const BG = '#0e0c0a';
const CARD = 'rgba(255,244,222,0.05)';
const TEXT = '#f2e8d5';
const TEXT_SOFT = 'rgba(242,232,213,0.72)';

type QuickAction = {
  title: string;
  line: string;
  infoHref: string;
  bookHref: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: 'Gratis fotoshoot',
    line: 'Volledig gratis en zonder verplichtingen — ontdek of modellenwerk iets voor jou is.',
    infoHref: '/portal/guest?p=gratis-fotoshoot',
    bookHref: '/portal/guest?book=gratis-fotoshoot',
  },
  {
    title: 'Casting',
    line: 'Schrijf je in voor een casting voor echte opdrachten. Ervaring is niet nodig.',
    infoHref: '/portal/guest?p=casting',
    bookHref: '/portal/guest?book=casting',
  },
  {
    title: 'Intake gesprek',
    line: 'Vrijblijvend gesprek over jouw uitstraling, profiel en mogelijkheden.',
    infoHref: '/portal/guest?p=intake-gesprek',
    bookHref: '/portal/guest?book=intake-gesprek',
  },
];

function ChevronRow({ href, label, sub }: { href: string; label: string; sub?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 px-4 py-3.5"
      style={{ borderTop: `1px solid ${GOLD_LINE}` }}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold" style={{ color: TEXT }}>
          {label}
        </span>
        {sub ? (
          <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: TEXT_SOFT }}>
            {sub}
          </span>
        ) : null}
      </span>
      <span aria-hidden className="shrink-0 text-lg" style={{ color: GOLD_SOFT }}>
        ›
      </span>
    </Link>
  );
}

export function MobileBeginHome() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const modelHref = user ? '/portal/model' : '/lobby?tab=model';

  const menuItems: { label: string; href: string }[] = [
    { label: 'Home', href: '/' },
    { label: 'Model worden', href: '/portal/guest' },
    { label: 'Gratis fotoshoot', href: '/portal/guest?p=gratis-fotoshoot' },
    { label: 'Casting', href: '/portal/guest?p=casting' },
    { label: 'Intake gesprek', href: '/portal/guest?p=intake-gesprek' },
    { label: 'Doelgroepen', href: '/portal/guest?p=doelgroepen' },
    { label: 'Veelgestelde vragen', href: '/portal/guest?p=veelgestelde-vragen' },
    { label: 'Reviews', href: '/reviews' },
    { label: 'Berichten', href: '/portal/model?tab=push' },
    { label: 'Contact', href: '/portal/guest?p=contact' },
    { label: 'Modellenportaal', href: modelHref },
    { label: 'Klantenportaal', href: '/portal/client' },
  ];

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: BG }}>
      {/* App-balk met hamburger — donker met goudaccent. */}
      <header
        className="cm-appbar-safe sticky top-0 z-40"
        style={{ background: '#131314', borderBottom: `1px solid ${GOLD_LINE}` }}
      >
        <div className="flex h-12 items-center gap-2 px-2">
          <button
            type="button"
            aria-label="Menu openen"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <span className="flex flex-col gap-[5px]">
              <span className="block h-[2px] w-5" style={{ background: GOLD }} />
              <span className="block h-[2px] w-5" style={{ background: GOLD }} />
              <span className="block h-[2px] w-5" style={{ background: GOLD }} />
            </span>
          </button>
          <p
            className="notranslate min-w-0 flex-1 truncate font-serif text-[15px] font-semibold tracking-[0.14em]"
            style={{ color: GOLD }}
          >
            CLASS-MODELS
          </p>
          {user ? (
            <button
              type="button"
              onClick={() => logout()}
              className="shrink-0 rounded-full px-3 py-1 text-[12px]"
              style={{ color: TEXT_SOFT, border: `1px solid ${GOLD_LINE}` }}
            >
              Uitloggen
            </button>
          ) : (
            <Link
              href="/lobby?tab=model"
              className="shrink-0 rounded-full px-3 py-1 text-[12px]"
              style={{ color: TEXT_SOFT, border: `1px solid ${GOLD_LINE}` }}
            >
              Inloggen
            </Link>
          )}
        </div>
      </header>

      {/* Overlay bij open menu. */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Inschuifmenu links. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[320px] flex-col shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#131314', borderRight: `1px solid ${GOLD_LINE}` }}
      >
        <div className="cm-appbar-safe shrink-0" style={{ borderBottom: `1px solid ${GOLD_LINE}` }}>
          <div className="flex h-12 items-center justify-between gap-2 pl-4 pr-1">
            <p
              className="notranslate truncate font-serif text-[14px] font-semibold tracking-[0.14em]"
              style={{ color: GOLD }}
            >
              MENU
            </p>
            <button
              type="button"
              aria-label="Menu sluiten"
              onClick={close}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl leading-none"
              style={{ color: GOLD }}
            >
              ×
            </button>
          </div>
        </div>
        <nav className="cm-safe-bottom min-h-0 flex-1 overflow-y-auto" onClick={close}>
          {menuItems.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="flex items-center justify-between gap-2 px-4 py-3 text-[14.5px] font-medium"
              style={{ color: TEXT, borderBottom: '1px solid rgba(233,199,128,0.14)' }}
            >
              <span>{m.label}</span>
              <span aria-hidden style={{ color: GOLD_SOFT }}>
                ›
              </span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Inhoud — eenvoudig, zonder foto's of films. */}
      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10 pt-6">
        <h1 className="m-0 font-serif text-[26px] font-semibold leading-tight" style={{ color: TEXT }}>
          Welkom bij <span style={{ color: GOLD }}>Class-Models</span>
        </h1>
        <p className="m-0 mt-2 text-[14px] leading-relaxed" style={{ color: TEXT_SOFT }}>
          Hier vind je alle info om model te worden, kan je deelnemen aan een casting, een gratis
          testfotoshoot boeken of een intakegesprek plannen.
        </p>

        {/* Snel boeken — de drie belangrijkste acties bovenaan. */}
        <h2
          className="m-0 mt-7 font-serif text-[13px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          Snel boeken
        </h2>
        <div className="mt-3 space-y-3">
          {QUICK_ACTIONS.map((a) => (
            <section
              key={a.title}
              className="rounded-xl px-4 py-4"
              style={{ background: CARD, border: `1px solid ${GOLD_LINE}` }}
            >
              <h3 className="m-0 font-serif text-[19px] font-semibold" style={{ color: TEXT }}>
                {a.title}
              </h3>
              <p className="m-0 mt-1.5 text-[13.5px] leading-snug" style={{ color: TEXT_SOFT }}>
                {a.line}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Link
                  href={a.infoHref}
                  className="flex items-center justify-center rounded-lg px-3 py-2.5 text-[13.5px] font-semibold"
                  style={{ color: GOLD, border: `1px solid ${GOLD_SOFT}` }}
                >
                  Info
                </Link>
                <Link
                  href={a.bookHref}
                  className="flex items-center justify-center rounded-lg px-3 py-2.5 text-[13.5px] font-bold"
                  style={{ background: GOLD, color: '#191510' }}
                >
                  Afspraak boeken
                </Link>
              </div>
            </section>
          ))}
        </div>

        {/* Info — alle nuttige inhoud, eenvoudig als lijst. */}
        <h2
          className="m-0 mt-8 font-serif text-[13px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          Info
        </h2>
        <div
          className="mt-3 overflow-hidden rounded-xl"
          style={{ background: CARD, border: `1px solid ${GOLD_LINE}` }}
        >
          <div className="[&>a:first-child]:!border-t-0">
            <ChevronRow
              href="/portal/guest"
              label="Model worden"
              sub="Waarom Class-Models, wat mag je verwachten"
            />
            <ChevronRow href="/portal/guest?p=doelgroepen" label="Doelgroepen" />
            <ChevronRow href="/portal/guest?p=veelgestelde-vragen" label="Veelgestelde vragen" />
            <ChevronRow href="/reviews" label="Reviews" sub="Ervaringen van onze modellen" />
            <ChevronRow href="/portal/guest?p=contact" label="Contact" sub="Adres, e-mail en telefoon" />
          </div>
        </div>

        {/* Berichten — pushberichten snel terug te vinden. */}
        <h2
          className="m-0 mt-8 font-serif text-[13px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          Berichten
        </h2>
        <div
          className="mt-3 overflow-hidden rounded-xl"
          style={{ background: CARD, border: `1px solid ${GOLD_LINE}` }}
        >
          <div className="[&>a:first-child]:!border-t-0">
            <ChevronRow
              href="/portal/model?tab=push"
              label="Pushberichten"
              sub="Alle berichten van Class-Models op een rij (inloggen als model)"
            />
          </div>
        </div>

        {/* Portalen. */}
        <h2
          className="m-0 mt-8 font-serif text-[13px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          Portalen
        </h2>
        <div
          className="mt-3 overflow-hidden rounded-xl"
          style={{ background: CARD, border: `1px solid ${GOLD_LINE}` }}
        >
          <div className="[&>a:first-child]:!border-t-0">
            <ChevronRow href={modelHref} label="Modellenportaal" sub="Voor ingeschreven modellen" />
            <ChevronRow href="/portal/client" label="Klantenportaal" sub="Voor bedrijven en klanten" />
          </div>
        </div>

        <p className="m-0 mt-8 text-center text-[12px]" style={{ color: 'rgba(242,232,213,0.45)' }}>
          Class-Models — Provinciebaan 3, 2235 Hulshout
        </p>
      </div>
    </div>
  );
}
