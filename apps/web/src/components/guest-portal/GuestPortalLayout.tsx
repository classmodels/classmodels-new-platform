'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Fragment, useCallback, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GuestContactSection } from '@/components/guest-portal/GuestContactSection';
import {
  CARD_MODEL_WORDEN,
  DOELGROEPEN_CARDS,
  CASTING_PAGE,
  DOELGROEPEN_INTRO,
  GUEST_CONTACT_INFO,
  GUEST_FAQ,
  GUEST_MENU,
  GUEST_SIDEBAR_MENU,
  GRATIS_FOTOSHOOT_PAGE,
  INTAKE_GESPREK_PAGE,
  MODEL_WORDEN_STATS,
  MODEL_WORDEN_TRUST_BAR,
  WAAROM_CHECKLIST,
  WAAROM_PARAGRAPHS,
  type GuestMenuId,
} from '@/components/guest-portal/guest-portal-data';

const GUEST_MENU_IDS = GUEST_MENU.map((m) => m.id) as readonly GuestMenuId[];

function parseGuestMenuParam(raw: string | null): GuestMenuId | null {
  if (!raw) return null;
  return (GUEST_MENU_IDS as readonly string[]).includes(raw) ? (raw as GuestMenuId) : null;
}

/** Next.js `useSearchParams` volgt soms `router.replace` niet; sync met echte URL + history API. */
const guestSearchListeners = new Set<() => void>();
let guestHistoryPatched = false;

function emitGuestSearchChanged() {
  guestSearchListeners.forEach((l) => l());
}

function subscribeGuestSearch(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  if (!guestHistoryPatched) {
    guestHistoryPatched = true;
    const { pushState, replaceState } = history;
    history.pushState = function (...args: Parameters<typeof pushState>) {
      const r = pushState.apply(history, args);
      queueMicrotask(emitGuestSearchChanged);
      return r;
    };
    history.replaceState = function (...args: Parameters<typeof replaceState>) {
      const r = replaceState.apply(history, args);
      queueMicrotask(emitGuestSearchChanged);
      return r;
    };
  }
  guestSearchListeners.add(listener);
  const onPop = () => listener();
  window.addEventListener('popstate', onPop);
  return () => {
    guestSearchListeners.delete(listener);
    window.removeEventListener('popstate', onPop);
  };
}

function useGuestPortalSearchString(fallbackFromNext: string) {
  return useSyncExternalStore(
    subscribeGuestSearch,
    () => (typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : ''),
    () => fallbackFromNext,
  );
}

function guestMailtoHref(bookingSubject: string) {
  return `mailto:${GUEST_CONTACT_INFO.email}?subject=${encodeURIComponent(bookingSubject)}`;
}

function CheckDisc() {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-burgundy text-[10px] font-bold text-white"
      aria-hidden
    >
      ✓
    </span>
  );
}

function IntakeStepNumber({ n }: { n: number }) {
  return (
    <span
      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-burgundy text-xs font-bold text-white"
      aria-hidden
    >
      {n}
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

function TrustBarIcon({ kind }: { kind: (typeof MODEL_WORDEN_TRUST_BAR)[number]['icon'] }) {
  const sym = { star: '★', heart: '♥', circle: '●', diamond: '♦', check: '✓' }[kind];
  return (
    <span className="shrink-0 text-[11px] leading-none text-burgundy md:text-[12px]" aria-hidden>
      {sym}
    </span>
  );
}

/** Drie kolommen — compactere typografie zodat de kolommen minder hoog worden. */
function ModelWordenColumnCard({
  kicker,
  title,
  bullets,
  cta,
  onCta,
}: ContentCardProps) {
  return (
    <article className="flex h-full flex-col rounded-cm border border-line bg-white px-3 py-4 shadow-sm md:px-4 md:py-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink md:text-[10px]">{kicker}</p>
      <h3 className="mt-1.5 font-serif text-base font-semibold leading-snug text-ink md:text-[1.05rem]">
        {title}
      </h3>
      <ul className="mt-3 min-h-0 flex-1 list-outside list-disc space-y-1.5 pl-4 text-xs leading-snug text-ink/80 marker:text-muted md:pl-[1.1rem]">
        {bullets.map((b) => (
          <li key={b} className="pl-0.5">
            {b}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onCta}
        className="mt-6 w-full shrink-0 rounded-cm bg-ink py-2 text-center text-xs font-semibold text-white hover:bg-ink/90 md:mt-7 md:text-[13px]"
      >
        {cta}
      </button>
    </article>
  );
}

/** Alleen het onderste deel van de rode zone (Model worden). */
function ModelWordenHeroInner({ onNav }: { onNav: (id: GuestMenuId) => void }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_min(260px,34%)] md:items-center md:gap-8">
      <div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl">
          Model worden begint hier
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90">
          Kies hieronder hoe je wilt starten: gratis test-fotoshoot, casting of een vrijblijvend intakegesprek.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNav('gratis-fotoshoot')}
            className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20"
          >
            Gratis fotoshoot
          </button>
          <button
            type="button"
            onClick={() => onNav('casting')}
            className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20"
          >
            Casting
          </button>
          <button
            type="button"
            onClick={() => onNav('intake-gesprek')}
            className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20"
          >
            Intakegesprek
          </button>
        </div>
      </div>
      <div className="rounded-cm border border-white/25 bg-black/20 p-4 text-xs leading-relaxed text-white/90 md:text-sm">
        <p className="font-medium text-white">Class-Models — gastenportaal</p>
        <p className="mt-2">
          Hier lees je hoe je start als model: van gratis testshoot tot casting en intake. Gebruik het menu links voor
          alle onderwerpen; hieronder vind je een overzicht in drie stappen.
        </p>
      </div>
    </div>
  );
}

/** USP-balk: twee regels tekst per item, verticale scheiding — direct onder de drie kolommen. */
function ModelWordenTrustBarStrip() {
  return (
    <section
      className="rounded-cm border border-line bg-white shadow-sm"
      aria-label="Kernpunten van Class-Models"
    >
      <div className="flex min-h-[3.25rem] w-full items-stretch overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:min-h-[3.5rem] [&::-webkit-scrollbar]:hidden">
        {MODEL_WORDEN_TRUST_BAR.map((row, i) => (
          <Fragment key={`${row.line1}-${row.line2}`}>
            {i > 0 ? (
              <div className="flex shrink-0 items-center self-stretch py-2.5" aria-hidden>
                <div className="h-9 w-px bg-line sm:h-10" />
              </div>
            ) : null}
            <div className="flex min-w-[8.75rem] flex-1 items-center justify-center gap-2 px-2 py-2 sm:min-w-0 sm:px-2.5 md:gap-2.5 md:px-3">
              <TrustBarIcon kind={row.icon} />
              <div className="min-w-0 text-left font-serif text-[10px] font-bold leading-[1.18] text-ink md:text-[11px]">
                <span className="block">{row.line1}</span>
                <span className="block">{row.line2}</span>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
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

function GuestPortalCtaHeading() {
  return (
    <div className="min-w-0 border-l-4 border-burgundy pl-3 md:pl-4">
      <h3 className="font-serif text-xl font-semibold leading-[1.12] text-ink md:text-2xl lg:text-[1.7rem] lg:leading-[1.1]">
        <span className="block">Ben jij klaar om de eerste</span>
        <span className="block">stap te zetten?</span>
      </h3>
      <p className="mt-3.5 max-w-xl text-[10px] leading-snug text-muted md:mt-4 md:text-[11px]">
        Kies wat het best bij jou past: gratis testshoot, casting of intakegesprek.
      </p>
    </div>
  );
}

const ctaBtnRowClass =
  'flex shrink-0 flex-row flex-nowrap items-stretch gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:overflow-visible [&::-webkit-scrollbar]:hidden';

const ctaBtnBurgundyClass =
  'shrink-0 whitespace-nowrap rounded-cm bg-burgundy px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-burgundyDeep sm:px-4 sm:text-xs md:text-sm';

function GuestPortalCtaRow({ onSelect }: { onSelect: (id: GuestMenuId) => void }) {
  return (
    <div className="rounded-cm border border-line bg-panel px-4 py-4 md:px-5 md:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1 lg:pr-4">
          <GuestPortalCtaHeading />
        </div>
        <div className={ctaBtnRowClass}>
          <button type="button" onClick={() => onSelect('gratis-fotoshoot')} className={ctaBtnBurgundyClass}>
            Gratis fotoshoot
          </button>
          <button type="button" onClick={() => onSelect('casting')} className={ctaBtnBurgundyClass}>
            Casting
          </button>
          <button type="button" onClick={() => onSelect('intake-gesprek')} className={ctaBtnBurgundyClass}>
            Intake
          </button>
        </div>
      </div>
    </div>
  );
}

type GuestOfferPageDef = {
  expectTitle: string;
  expectBullets: readonly string[];
  whyTitle: string;
  whyParagraph: string;
  bookingSubject: string;
  ctaButton: string;
};

function GuestOfferWithDoelgroepenPage({
  page,
  onMenuSelect,
}: {
  page: GuestOfferPageDef;
  onMenuSelect: (id: GuestMenuId) => void;
}) {
  const mailHref = guestMailtoHref(page.bookingSubject);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,34%)] lg:items-start">
        <SectionBlock>
          <h3 className="font-serif text-xl font-semibold text-ink">{page.expectTitle}</h3>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink/90">
            {page.expectBullets.map((line) => (
              <li key={line} className="flex gap-3">
                <CheckDisc />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 font-serif text-xl font-semibold text-ink">{page.whyTitle}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">{page.whyParagraph}</p>
          <a
            href={mailHref}
            className="mt-5 block w-full rounded-cm bg-burgundy py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-burgundyDeep"
          >
            {page.ctaButton}
          </a>
        </SectionBlock>
        <div className="min-w-0 space-y-3 lg:sticky lg:top-4">
          <h3 className="font-serif text-lg font-semibold text-ink">Doelgroepen</h3>
          <div className="space-y-2.5">
            {DOELGROEPEN_CARDS.map((c) => (
              <div
                key={c.title}
                className="rounded-cm border border-line bg-panel px-3 py-3 shadow-sm md:px-4 md:py-3"
              >
                <p className="font-serif text-sm font-semibold text-ink">{c.title}</p>
                <p className="mt-1 text-xs leading-snug text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <GuestPortalCtaRow onSelect={onMenuSelect} />
    </div>
  );
}

type GuestServicePageDef = {
  howTitle: string;
  whyTitle: string;
  bookingSubject: string;
  ctaButton: string;
  steps: readonly string[];
};

function GuestServiceTwoColumnPage({
  page,
  onMenuSelect,
}: {
  page: GuestServicePageDef;
  onMenuSelect: (id: GuestMenuId) => void;
}) {
  const mailHref = guestMailtoHref(page.bookingSubject);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <SectionBlock>
          <h3 className="font-serif text-xl font-semibold text-ink">{page.howTitle}</h3>
          <ol className="mt-4 list-none space-y-3">
            {page.steps.map((text, i) => (
              <li key={text} className="flex gap-3 text-sm leading-relaxed text-ink/90">
                <IntakeStepNumber n={i + 1} />
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <a
            href={mailHref}
            className="mt-5 block w-full rounded-cm bg-burgundy py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-burgundyDeep"
          >
            {page.ctaButton}
          </a>
        </SectionBlock>
        <SectionBlock>
          <h3 className="font-serif text-xl font-semibold text-ink">{page.whyTitle}</h3>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink/90">
            {WAAROM_CHECKLIST.map((line) => (
              <li key={line} className="flex gap-3">
                <CheckDisc />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>
      </div>
      <GuestPortalCtaRow onSelect={onMenuSelect} />
    </div>
  );
}

export function GuestPortalLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchString = useGuestPortalSearchString(searchParams.toString());
  const active: GuestMenuId =
    parseGuestMenuParam(new URLSearchParams(searchString).get('p')) ?? 'model-worden';

  const goMenu = useCallback(
    (id: GuestMenuId) => {
      if (id === 'model-worden') {
        router.replace('/portal/guest', { scroll: false });
      } else {
        router.replace(`/portal/guest?p=${encodeURIComponent(id)}`, { scroll: false });
      }
      queueMicrotask(emitGuestSearchChanged);
    },
    [router],
  );

  const menuLabel = GUEST_MENU.find((m) => m.id === active)?.label ?? '';

  const ctaFor = (target: GuestMenuId) => () => goMenu(target);

  const renderModelWorden = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-stretch md:gap-4">
        {CARD_MODEL_WORDEN.map((c, i) => (
          <ModelWordenColumnCard
            key={c.kicker}
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
      </div>

      <ModelWordenTrustBarStrip />

      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.28fr)_minmax(0,0.82fr)] lg:items-start">
        <SectionBlock>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink">WAAROM CLASS-MODELS</p>
          <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">Iedereen verdient het om te schitteren</h3>
          <div className="mt-4 space-y-3 font-serif text-sm leading-relaxed text-muted">
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
          <div className="mt-6 grid grid-cols-2 gap-2.5 md:gap-3">
            {MODEL_WORDEN_STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-cm border border-burgundyDeep/40 bg-burgundy px-3 py-3 text-center shadow-sm md:px-4 md:py-3.5"
              >
                <p className="font-serif text-xl font-bold text-white md:text-2xl">{s.value}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-white md:text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </SectionBlock>

        <SectionBlock>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink">DOELGROEPEN</p>
          <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">Voor wie?</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">{DOELGROEPEN_INTRO}</p>
          <div className="mt-5 space-y-3">
            {DOELGROEPEN_CARDS.map((c) => (
              <div
                key={c.title}
                className="rounded-cm border border-burgundy/18 bg-gradient-to-br from-burgundy/[0.08] via-burgundy/[0.03] to-white/90 px-4 py-3 shadow-[0_0_18px_-6px_rgba(111,18,27,0.14)]"
              >
                <p className="font-serif text-base font-semibold text-ink">{c.title}</p>
                <p className="mt-1 text-sm text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </SectionBlock>
      </div>

      <GuestPortalCtaRow onSelect={goMenu} />
    </div>
  );

  const renderDoelgroepen = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOELGROEPEN_CARDS.map((c) => (
          <div key={c.title} className="rounded-cm border border-line bg-white px-4 py-4 shadow-sm">
            <p className="font-serif text-base font-semibold text-ink">{c.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{c.body}</p>
          </div>
        ))}
      </div>
      <GuestPortalCtaRow onSelect={goMenu} />
    </div>
  );

  const renderVeelgesteldeVragen = () => (
    <div className="space-y-4">
      {GUEST_FAQ.map((item) => (
        <div
          key={item.q}
          className="flex gap-3 rounded-cm border border-line bg-white px-4 py-4 shadow-sm md:gap-4 md:px-5 md:py-4"
        >
          <span
            className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-burgundy md:mt-2.5 md:h-3 md:w-3"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-serif text-base font-bold leading-snug text-ink">{item.q}</p>
            <p className="mt-2 font-serif text-sm leading-relaxed text-muted">{item.a}</p>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/portal/guest?p=contact"
          className="rounded-cm bg-burgundy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-burgundyDeep"
        >
          Stel je vraag via contact
        </Link>
        <Link
          href="/"
          className="rounded-cm border-2 border-burgundy bg-white px-5 py-2.5 text-sm font-semibold text-burgundy transition hover:bg-burgundy/[0.06]"
        >
          Beginpagina
        </Link>
      </div>
    </div>
  );

  const renderContact = () => <GuestContactSection />;

  const renderIntakeGesprek = () => (
    <GuestServiceTwoColumnPage page={INTAKE_GESPREK_PAGE} onMenuSelect={goMenu} />
  );

  const renderGratisFotoshoot = () => (
    <GuestOfferWithDoelgroepenPage page={GRATIS_FOTOSHOOT_PAGE} onMenuSelect={goMenu} />
  );

  const renderCasting = () => (
    <GuestOfferWithDoelgroepenPage page={CASTING_PAGE} onMenuSelect={goMenu} />
  );

  const mainContent = () => {
    switch (active) {
      case 'model-worden':
        return renderModelWorden();
      case 'gratis-fotoshoot':
      case 'testshoot':
        return renderGratisFotoshoot();
      case 'casting':
        return renderCasting();
      case 'intake-gesprek':
        return renderIntakeGesprek();
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
      {/* Witte ruimte onder de site-header (zelfde breedte als scherm) */}
      <div className="w-full bg-white py-3 md:py-4" aria-hidden />

      {/* Rode hero — op elke pagina van het gastenportaal */}
      <div className="w-full bg-gradient-to-br from-burgundy via-burgundyDeep to-burgundy text-white shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div className="mx-auto w-full max-w-page px-4 py-8 md:px-6 md:py-10">
          <ModelWordenHeroInner onNav={goMenu} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-page px-4 pb-8 pt-6 md:px-6 md:pb-10 md:pt-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-stretch">
          <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-cm border border-line bg-white shadow-sm lg:sticky lg:top-4">
            <div className="shrink-0 border-b border-line bg-burgundy px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-white">
              Gast menu
            </div>
            <nav className="flex min-h-0 flex-1 flex-col bg-white" aria-label="Gastenmenu">
              <div className="shrink-0 divide-y divide-line">
                {GUEST_SIDEBAR_MENU.map((item) => {
                  const isActive = item.id === active;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goMenu(item.id)}
                      className={`flex w-full items-center justify-between gap-2 border-l-[3px] py-3 pl-3 pr-3 text-left text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-burgundy/35 focus-visible:ring-offset-0 ${
                        isActive
                          ? 'border-l-burgundy bg-panel text-ink'
                          : 'border-l-transparent text-ink hover:bg-panel/70'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-muted" aria-hidden>
                        ›
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="min-h-8 flex-1 bg-white" aria-hidden />
            </nav>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-cm border border-line bg-white shadow-sm">
            <div className="shrink-0 border-b border-line bg-burgundy px-4 py-2.5 text-sm font-semibold text-white">
              {menuLabel}
            </div>
            <div className="min-h-0 flex-1 p-4 md:p-6">{mainContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
