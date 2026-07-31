'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { applyPostLoginRedirect } from '@/lib/redirect-after-auth';
import { apiFetch } from '@/lib/api';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';

const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
/** Sessiesleutel: introfilm alleen bij het openen van de site/app, niet bij terugkeren. */
const INTRO_SEEN_KEY = 'cm-mobile-intro-seen';

/**
 * Mobiele versie (gsm + app). Drie schermen, gestuurd met `?m=`:
 * - start (geen parameter): heel eenvoudig — kies Gastenportaal, Modellenportaal
 *   of Klantenportaal (nog niet aanklikbaar). Geen menu zichtbaar.
 * - `?m=guest`: het gastenportaal — "Maak snel een keuze" (gratis fotoshoot,
 *   casting, intake gesprek) en info model worden, met alleen het gastmenu.
 * - `?m=model`: het modellenportaal — duidelijk inloggen, wachtwoord vergeten
 *   of account aanmaken; alleen voor modellen met een contract.
 * Kleuren: zeer licht warmgrijs met donkerbruine en bronzen accenten
 * (naar de sfeer van de welkomsthal). De pc-versie blijft volledig ongewijzigd.
 */

const BG = '#f1eee8';
const CARD = '#faf8f4';
const LINE = '#ddd5c7';
const TEXT = '#372c1f';
const TEXT_SOFT = '#7a6e5d';
const ACCENT = '#8a6a3b';
const BAR = '#221c15';
const BAR_TEXT = '#f3ead8';
const CTA_BG = '#372c1f';
const CTA_TEXT = '#f6efe2';

function parseApiError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  try {
    const j = JSON.parse(err.message) as { message?: string | string[] };
    if (typeof j.message === 'string') return j.message;
    if (Array.isArray(j.message)) return j.message.join(', ');
  } catch {
    if (err.message && !err.message.startsWith('{')) return err.message;
  }
  return fallback;
}

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
    infoHref: '/gasten/gratis-fotoshoot',
    bookHref: '/?m=guest&book=gratis-fotoshoot',
  },
  {
    title: 'Casting',
    line: 'Schrijf je in voor een casting voor echte opdrachten. Ervaring is niet nodig.',
    infoHref: '/gasten/casting',
    bookHref: '/?m=guest&book=casting',
  },
  {
    title: 'Intake gesprek',
    line: 'Vrijblijvend gesprek over jouw uitstraling, profiel en mogelijkheden.',
    infoHref: '/gasten/intake',
    bookHref: '/?m=guest&book=intake',
  },
];

const MOBILE_BOOKINGS: Record<string, { title: string; slug: string; line: string }> = {
  'gratis-fotoshoot': {
    title: 'Gratis fotoshoot',
    slug: 'gratis-fotoshoot',
    line: 'Kies een moment. Daarna vult u kort uw gegevens in.',
  },
  casting: {
    title: 'Casting',
    slug: 'casting',
    line: 'Kies een castingmoment en schrijf u in.',
  },
  intake: {
    title: 'Intake gesprek',
    slug: 'intake-gesprek',
    line: 'Plan een vrijblijvend gesprek.',
  },
};
const GUEST_MENU_LINKS: { label: string; href: string }[] = [
  { label: 'Gastenportaal (home)', href: '/?m=guest' },
  { label: 'Model worden', href: '/gasten/model-worden' },
  { label: 'Gratis fotoshoot', href: '/gasten/gratis-fotoshoot' },
  { label: 'Testshoot-foto’s', href: '/gasten/testshoot' },
  { label: 'Casting', href: '/gasten/casting' },
  { label: 'Intake gesprek', href: '/gasten/intake' },
  { label: 'Doelgroepen', href: '/gasten/doelgroepen' },
  { label: 'Veelgestelde vragen', href: '/gasten/faq' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Contact', href: '/gasten/contact' },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="m-0 mt-7 font-serif text-[13px] font-semibold uppercase tracking-[0.22em]"
      style={{ color: ACCENT }}
    >
      {children}
    </h2>
  );
}

function ChevronRow({ href, label, sub }: { href: string; label: string; sub?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 px-4 py-3.5"
      style={{ borderTop: `1px solid ${LINE}` }}
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
      <span aria-hidden className="shrink-0 text-lg" style={{ color: ACCENT }}>
        ›
      </span>
    </Link>
  );
}

/**
 * Rij met '← Terug' (links, één stap terug) en 'Beginpagina' (rechts) —
 * blijft bij het scrollen bovenaan plakken, net onder de app-balk.
 */
function BackRow() {
  const router = useRouter();
  return (
    <div
      className="sticky z-30 -mx-4 flex items-center justify-between gap-2.5 px-4 py-2.5"
      style={{
        top: 'calc(48px + env(safe-area-inset-top, 0px))',
        background: BG,
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (typeof window !== 'undefined' && window.history.length > 1) router.back();
          else router.push('/');
        }}
        className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
        style={{ color: TEXT, border: `1px solid ${LINE}`, background: CARD }}
      >
        ← Terug
      </button>
      <Link
        href="/"
        className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
        style={{ color: CTA_TEXT, background: CTA_BG, border: `1px solid ${CTA_BG}` }}
      >
        Beginpagina
      </Link>
    </div>
  );
}

/** Bovenbalk zoals in het gastenportaal: donkere balk, vette witte titel + subtitel. */
function TopBar({ title, subtitle, onMenu }: { title: string; subtitle?: string; onMenu?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header
      className="cm-appbar-safe sticky top-0 z-40 shadow-md"
      style={{ background: BAR, color: BAR_TEXT }}
    >
      <div className="flex h-12 items-center gap-2 px-2">
        {onMenu ? (
          <button
            type="button"
            aria-label="Menu openen"
            onClick={onMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <span className="flex flex-col gap-[5px]">
              <span className="block h-[2px] w-5" style={{ background: BAR_TEXT }} />
              <span className="block h-[2px] w-5" style={{ background: BAR_TEXT }} />
              <span className="block h-[2px] w-5" style={{ background: BAR_TEXT }} />
            </span>
          </button>
        ) : (
          <span className="w-2" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="notranslate m-0 truncate text-sm font-bold uppercase leading-tight tracking-wide">
            {title}
          </p>
          {subtitle ? (
            <p className="m-0 truncate text-[11px] leading-tight" style={{ color: 'rgba(243,234,216,0.75)' }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {user ? (
          <button
            type="button"
            onClick={() => logout()}
            className="shrink-0 rounded-full px-3 py-1 text-[12px]"
            style={{ color: BAR_TEXT, border: '1px solid rgba(243,234,216,0.4)' }}
          >
            Uitloggen
          </button>
        ) : null}
      </div>
    </header>
  );
}

/**
 * Introfilm bij het openen van de site/app op de gsm: speelt fullscreen af
 * en fadet daarna naar het beginbeeld. Met knop Overslaan.
 */
function MobileIntroOverlay({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    window.setTimeout(onDone, 550);
  }, [onDone]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Nooit langer dan 3s op zwart blijven als film hapert / 404.
    const failSafe = window.setTimeout(finish, 3000);
    v.muted = true;
    const onErr = () => finish();
    v.addEventListener('error', onErr);
    const p = v.play();
    if (p) p.catch(() => finish());
    return () => {
      window.clearTimeout(failSafe);
      v.removeEventListener('error', onErr);
    };
  }, [finish]);

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center bg-black transition-opacity duration-500 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <video
        ref={videoRef}
        src={`${ASSET_BASE}/videos/mobile-intro.mp4`}
        className="h-full w-full object-contain"
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={finish}
        onError={finish}
      />
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 right-4 z-[1000] rounded-full px-4 py-2 text-[13px] font-semibold"
        style={{
          color: '#f3ead8',
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(243,234,216,0.45)',
        }}
      >
        Overslaan ≫
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Installeer de app: keuze Android / iPhone met duidelijke uitleg.    */
/* ------------------------------------------------------------------ */

type InstallPlatform = 'android' | 'ios';

/** Chrome/Edge op Android: het echte installatievenster van de browser. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function InstallStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ background: CTA_BG, color: CTA_TEXT }}
        aria-hidden
      >
        {n}
      </span>
      <span className="min-w-0 text-[13.5px] leading-relaxed" style={{ color: TEXT }}>
        {children}
      </span>
    </li>
  );
}

function InstallAppSection() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('android');
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Voorselectie op basis van het toestel.
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform('ios');
    // Al als app geopend? Dan is installeren niet meer nodig.
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (installed) return null;

  const tabStyle = (active: boolean): React.CSSProperties =>
    active
      ? { background: CTA_BG, color: CTA_TEXT, border: `1px solid ${CTA_BG}` }
      : { color: TEXT_SOFT, border: `1px solid ${LINE}`, background: BG };

  return (
    <div
      className="mt-8 overflow-hidden rounded-xl shadow-sm"
      style={{ background: CARD, border: `1px solid ${ACCENT}66` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <span className="min-w-0">
          <span className="block font-serif text-[18px] font-semibold" style={{ color: ACCENT }}>
            📲 Installeer de app op uw gsm
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug" style={{ color: TEXT_SOFT }}>
            Gratis — zet Class-Models als app op uw beginscherm.
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 text-lg transition-transform duration-200"
          style={{ color: ACCENT, transform: open ? 'rotate(90deg)' : 'none' }}
        >
          ›
        </span>
      </button>

      {open ? (
        <div className="px-4 pb-5" style={{ borderTop: `1px solid ${LINE}` }}>
          {/* Keuze Android / iPhone */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPlatform('android')}
              aria-pressed={platform === 'android'}
              className="rounded-lg px-2 py-2.5 text-center text-[13.5px] font-semibold"
              style={tabStyle(platform === 'android')}
            >
              Android
            </button>
            <button
              type="button"
              onClick={() => setPlatform('ios')}
              aria-pressed={platform === 'ios'}
              className="rounded-lg px-2 py-2.5 text-center text-[13.5px] font-semibold"
              style={tabStyle(platform === 'ios')}
            >
              iPhone / iPad
            </button>
          </div>

          {platform === 'android' ? (
            <div className="mt-4">
              {installEvt ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void installEvt.prompt();
                      void installEvt.userChoice.then((r) => {
                        if (r.outcome === 'accepted') {
                          setInstalled(true);
                        }
                      });
                    }}
                    className="w-full rounded-lg py-3 text-[15px] font-bold"
                    style={{ background: CTA_BG, color: CTA_TEXT }}
                  >
                    Direct installeren
                  </button>
                  <p className="m-0 mt-2 text-center text-[12px]" style={{ color: TEXT_SOFT }}>
                    Uw gsm vraagt dan om de app toe te voegen — tik op «Installeren».
                  </p>
                  <p
                    className="m-0 mt-4 text-[12.5px] font-semibold uppercase tracking-wide"
                    style={{ color: TEXT_SOFT }}
                  >
                    Of handmatig:
                  </p>
                </>
              ) : null}
              <ol className="m-0 mt-3 list-none space-y-2.5 p-0">
                <InstallStep n={1}>
                  Open <strong>www.class-models.com</strong> in <strong>Chrome</strong> op uw gsm.
                </InstallStep>
                <InstallStep n={2}>
                  Tik rechtsboven op de <strong>drie puntjes ( ⋮ )</strong>.
                </InstallStep>
                <InstallStep n={3}>
                  Kies <strong>«App installeren»</strong> (of «Toevoegen aan startscherm»).
                </InstallStep>
                <InstallStep n={4}>
                  Bevestig met <strong>«Installeren»</strong> — het Class-Models-icoon staat nu op uw
                  beginscherm, net als een gewone app.
                </InstallStep>
              </ol>
            </div>
          ) : (
            <div className="mt-4">
              <ol className="m-0 mt-1 list-none space-y-2.5 p-0">
                <InstallStep n={1}>
                  Open <strong>www.class-models.com</strong> in <strong>Safari</strong> op uw iPhone of
                  iPad (dit werkt alleen in Safari).
                </InstallStep>
                <InstallStep n={2}>
                  Tik onderaan op de <strong>deelknop</strong>{' '}
                  <span aria-hidden>(vierkantje met pijl omhoog ⬆︎)</span>.
                </InstallStep>
                <InstallStep n={3}>
                  Scroll in het lijstje naar beneden en kies <strong>«Zet op beginscherm»</strong>.
                </InstallStep>
                <InstallStep n={4}>
                  Tik rechtsboven op <strong>«Voeg toe»</strong> — het Class-Models-icoon staat nu op uw
                  beginscherm, net als een gewone app.
                </InstallStep>
              </ol>
            </div>
          )}

          <p
            className="m-0 mt-4 rounded-lg px-3 py-2.5 text-[12.5px] leading-snug"
            style={{ background: BG, border: `1px solid ${LINE}`, color: TEXT_SOFT }}
          >
            Via de app opent Class-Models op volledig scherm en kan u als model ook meldingen
            (pushberichten) ontvangen.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Startscherm: drie portaalkeuzes, geen menu.                         */
/* ------------------------------------------------------------------ */

function StartView() {
  const { user } = useAuth();
  return (
    <>
      <TopBar title="Class-Models" subtitle="Welkom" />
      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10 pt-8">
        <h1 className="m-0 font-serif text-[27px] font-semibold leading-tight" style={{ color: TEXT }}>
          Welkom bij <span style={{ color: ACCENT }}>Class-Models</span>
        </h1>
        <p className="m-0 mt-2 text-[14.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>
          Kies hieronder uw portaal.
        </p>

        <div className="mt-7 space-y-6">
          {/* Gastenportaal */}
          <Link
            href="/?m=guest"
            className="block rounded-xl px-4 py-5 shadow-sm"
            style={{ background: CARD, border: `1px solid ${ACCENT}66` }}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-serif text-[21px] font-semibold" style={{ color: ACCENT }}>
                Gastenportaal
              </span>
              <span aria-hidden className="text-xl" style={{ color: ACCENT }}>
                ›
              </span>
            </span>
            <span className="mt-1.5 block text-[13.5px] leading-snug" style={{ color: TEXT_SOFT }}>
              Model worden? Klik hier — gratis fotoshoot, casting, intake gesprek en alle info.
            </span>
          </Link>

          {/* Modellenportaal — al ingelogd? Dan rechtstreeks naar het portaal. */}
          <Link
            href={user ? '/modellen' : '/?m=model'}
            className="block rounded-xl px-4 py-5 shadow-sm"
            style={{ background: CARD, border: `1px solid ${LINE}` }}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-serif text-[21px] font-semibold" style={{ color: TEXT }}>
                Modellenportaal
              </span>
              <span aria-hidden className="text-xl" style={{ color: ACCENT }}>
                ›
              </span>
            </span>
            <span className="mt-1.5 block text-[13.5px] leading-snug" style={{ color: TEXT_SOFT }}>
              {user
                ? 'U bent ingelogd — klik hier om direct naar uw portaal te gaan.'
                : 'Alleen voor ingeschreven modellen met een contract bij Class-Models.'}
            </span>
          </Link>

          {/* Klantenportaal — zichtbaar maar nog niet aanklikbaar. */}
          <div
            aria-disabled="true"
            className="rounded-xl px-4 py-5"
            style={{ background: CARD, border: `1px solid ${LINE}`, opacity: 0.55 }}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-serif text-[21px] font-semibold" style={{ color: TEXT }}>
                Klantenportaal
              </span>
            </span>
            <span className="mt-1.5 block text-[13.5px] leading-snug" style={{ color: TEXT_SOFT }}>
              Voor bedrijven en klanten — binnenkort beschikbaar.
            </span>
          </div>
        </div>

        <InstallAppSection />

        <p className="m-0 mt-10 text-center text-[12px]" style={{ color: TEXT_SOFT }}>
          Class-Models — Provinciebaan 3, 2235 Hulshout
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Gastenportaal: maak snel een keuze + info, met gastmenu.            */
/* ------------------------------------------------------------------ */

function MobileBookView({ bookKey }: { bookKey: string }) {
  const router = useRouter();
  const meta = MOBILE_BOOKINGS[bookKey];

  useEffect(() => {
    if (!meta) router.replace('/?m=guest');
  }, [meta, router]);

  if (!meta) {
    return <div className="min-h-[100dvh] w-full" style={{ background: BG }} aria-hidden />;
  }

  return (
    <>
      <TopBar title={meta.title} subtitle="Afspraak boeken" />
      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10">
        <div
          className="sticky z-30 -mx-4 flex items-center justify-between gap-2.5 px-4 py-2.5"
          style={{
            top: 'calc(48px + env(safe-area-inset-top, 0px))',
            background: BG,
            borderBottom: `1px solid ${LINE}`,
          }}
        >
          <Link
            href="/?m=guest"
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
            style={{ color: TEXT, border: `1px solid ${LINE}`, background: CARD }}
          >
            ← Terug
          </Link>
          <Link
            href="/"
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
            style={{ color: CTA_TEXT, background: CTA_BG, border: `1px solid ${CTA_BG}` }}
          >
            Beginpagina
          </Link>
        </div>

        <h1 className="m-0 mt-5 font-serif text-[24px] font-semibold leading-tight" style={{ color: TEXT }}>
          {meta.title}
        </h1>
        <p className="m-0 mt-2 text-[14px] leading-relaxed" style={{ color: TEXT_SOFT }}>
          {meta.line}
        </p>

        <div
          className="mt-5 overflow-hidden rounded-xl px-3 py-4 shadow-sm"
          style={{ background: CARD, border: `1px solid ${LINE}` }}
        >
          <GuestBookingPanel
            calendarSlug={meta.slug}
            heading=""
            hideSlotTitle
            variant="default"
            onClose={() => router.push('/?m=guest')}
          />
        </div>
      </div>
    </>
  );
}

function GuestView() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const bookKey = searchParams.get('book');
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

  if (bookKey) {
    return <MobileBookView bookKey={bookKey} />;
  }

  return (
    <>
      <TopBar title="Gastenportaal" subtitle="Model worden bij Class-Models" onMenu={() => setOpen(true)} />

      {/* Overlay + inschuifmenu: alleen het gastmenu, plus de andere portalen. */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Gastenportaal menu"
        className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[320px] flex-col shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: BAR, borderRight: '1px solid rgba(243,234,216,0.15)' }}
      >
        <div className="cm-appbar-safe shrink-0" style={{ borderBottom: '1px solid rgba(243,234,216,0.15)' }}>
          <div className="flex h-12 items-center justify-between gap-2 pl-4 pr-1">
            <p
              className="notranslate m-0 truncate text-sm font-bold uppercase tracking-wide"
              style={{ color: BAR_TEXT }}
            >
              Gastenportaal
            </p>
            <button
              type="button"
              aria-label="Menu sluiten"
              onClick={close}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl leading-none"
              style={{ color: BAR_TEXT }}
            >
              ×
            </button>
          </div>
        </div>
        <nav className="cm-safe-bottom min-h-0 flex-1 overflow-y-auto" onClick={close}>
          {GUEST_MENU_LINKS.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="flex items-center justify-between gap-2 px-4 py-3 text-[14.5px] font-medium"
              style={{ color: '#e8e0cf', borderBottom: '1px solid rgba(243,234,216,0.1)' }}
            >
              <span>{m.label}</span>
              <span aria-hidden style={{ color: 'rgba(243,234,216,0.5)' }}>
                ›
              </span>
            </Link>
          ))}
          {/* Andere portalen onderaan het menu — ingelogd = direct naar het portaal. */}
          <Link
            href={user ? '/modellen' : '/?m=model'}
            className="flex items-center justify-between gap-2 px-4 py-3 text-[14.5px] font-semibold"
            style={{
              color: BAR_TEXT,
              borderBottom: '1px solid rgba(243,234,216,0.1)',
              background: 'rgba(243,234,216,0.08)',
            }}
          >
            <span>Modellenportaal</span>
            <span aria-hidden style={{ color: 'rgba(243,234,216,0.5)' }}>
              ›
            </span>
          </Link>
          <div
            aria-disabled="true"
            className="flex items-center justify-between gap-2 px-4 py-3 text-[14.5px] font-semibold"
            style={{ color: 'rgba(243,234,216,0.5)', borderBottom: '1px solid rgba(243,234,216,0.1)' }}
          >
            <span>Klantenportaal (binnenkort)</span>
          </div>
        </nav>
      </aside>

      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10">
        <BackRow />

        <h1 className="m-0 mt-5 font-serif text-[25px] font-semibold leading-tight">
          <span style={{ color: ACCENT }}>Gastenportaal</span>
        </h1>
        <p className="m-0 mt-2 text-[14px] leading-relaxed" style={{ color: TEXT_SOFT }}>
          Hier vind je alle info om model te worden, kan je deelnemen aan een casting, een gratis
          testfotoshoot boeken of een intakegesprek plannen.
        </p>

        <SectionTitle>Maak snel een keuze</SectionTitle>
        <div className="mt-3 space-y-4">
          {QUICK_ACTIONS.map((a) => (
            <section
              key={a.title}
              className="rounded-xl px-4 py-4 shadow-sm"
              style={{ background: CARD, border: `1px solid ${LINE}` }}
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
                  style={{ color: ACCENT, border: `1px solid ${ACCENT}99`, background: BG }}
                >
                  Info
                </Link>
                <Link
                  href={a.bookHref}
                  className="flex items-center justify-center rounded-lg px-3 py-2.5 text-[13.5px] font-bold"
                  style={{ background: CTA_BG, color: CTA_TEXT }}
                >
                  Afspraak boeken
                </Link>
              </div>
            </section>
          ))}
        </div>

        <SectionTitle>Info model worden</SectionTitle>
        <div
          className="mt-3 overflow-hidden rounded-xl shadow-sm"
          style={{ background: CARD, border: `1px solid ${LINE}` }}
        >
          <div className="[&>a:first-child]:!border-t-0">
            <ChevronRow
              href="/gasten/model-worden"
              label="Model worden"
              sub="Waarom Class-Models, wat mag je verwachten"
            />
            <ChevronRow
              href="/gasten/testshoot"
              label="Testshoot-foto’s"
              sub="Bekijk en download uw foto’s op gsm"
            />
            <ChevronRow href="/gasten/doelgroepen" label="Doelgroepen" />
            <ChevronRow href="/gasten/faq" label="Veelgestelde vragen" />
            <ChevronRow href="/reviews" label="Reviews" sub="Ervaringen van onze modellen" />
            <ChevronRow href="/gasten/contact" label="Contact" sub="Adres, e-mail en telefoon" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Modellenportaal: inloggen / wachtwoord vergeten / account aanmaken. */
/* ------------------------------------------------------------------ */

type ModelMode = 'login' | 'forgot' | 'register';

function ModelView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const { login, register: registerUser, user, loading } = useAuth();
  const [mode, setMode] = useState<ModelMode>('login');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** Al ingelogd? Doorsturen op rol (admin → backsite, model → portaal). */
  useEffect(() => {
    if (!loading && user) {
      applyPostLoginRedirect(user, router, { next });
    }
  }, [loading, user, router, next]);

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [email2, setEmail2] = useState('');
  const [pass2, setPass2] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  const switchMode = (m: ModelMode) => {
    setMode(m);
    setErr(null);
    setForgotMsg(null);
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = await login(email.trim(), pass, { rememberMe });
      applyPostLoginRedirect(u, router, { next });
    } catch (er) {
      setErr(parseApiError(er, 'Inloggen is niet gelukt. Controleer uw gegevens.'));
    } finally {
      setBusy(false);
    }
  };

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (email.trim().toLowerCase() !== email2.trim().toLowerCase()) {
      setErr('De e-mailadressen komen niet overeen.');
      return;
    }
    if (pass !== pass2) {
      setErr('De wachtwoorden komen niet overeen.');
      return;
    }
    setBusy(true);
    try {
      const u = await registerUser({
        role: 'model',
        email: email.trim(),
        password: pass,
        firstName: first.trim(),
        lastName: last.trim(),
        phone: phone.trim() || undefined,
      });
      applyPostLoginRedirect(u, router, { fromRegister: true });
    } catch (er) {
      setErr(parseApiError(er, 'Account aanmaken is niet gelukt.'));
    } finally {
      setBusy(false);
    }
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setForgotMsg(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ message?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: email.trim() }),
      });
      setForgotMsg(
        res.message ??
          'Als er een account is, ontvangt u een e-mail met instructies. Controleer ook uw spamfolder.',
      );
    } catch (er) {
      setErr(parseApiError(er, 'Versturen is niet gelukt. Probeer het later opnieuw.'));
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'mt-2.5 w-full rounded-lg px-3.5 py-3 text-[15px] outline-none';
  const inputStyle: React.CSSProperties = {
    background: '#ffffff',
    border: `1px solid ${LINE}`,
    color: TEXT,
  };

  const modeTabs: { id: ModelMode; label: string }[] = [
    { id: 'login', label: 'Inloggen' },
    { id: 'forgot', label: 'Wachtwoord vergeten' },
    { id: 'register', label: 'Account aanmaken' },
  ];

  // Tijdens het laden van de sessie (of vlak voor de doorverwijzing) geen
  // inlogformulier tonen aan iemand die al ingelogd is.
  if (loading || user) {
    return (
      <>
        <TopBar title="Modellenportaal" subtitle="Even geduld…" />
        <div className="mx-auto w-full max-w-[560px] px-4 pt-10 text-center text-[14px]" style={{ color: TEXT_SOFT }}>
          {user ? 'U bent al ingelogd — u wordt doorgestuurd naar uw portaal…' : 'Laden…'}
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Modellenportaal" subtitle="Inloggen of account aanmaken" />
      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10">
        <BackRow />

        <h1 className="m-0 mt-5 font-serif text-[25px] font-semibold leading-tight">
          <span style={{ color: ACCENT }}>Modellenportaal</span>
        </h1>

        {/* Duidelijke vermelding: alleen voor modellen met een contract. */}
        <div
          className="mt-3 rounded-xl px-4 py-3"
          style={{ background: '#f5edda', border: `1px solid ${ACCENT}66` }}
        >
          <p className="m-0 text-[13.5px] leading-snug" style={{ color: TEXT }}>
            <strong style={{ color: ACCENT }}>Let op:</strong> alleen voor modellen met een contract
            bij Class-Models. Nog geen contract? Meld u dan aan via het{' '}
            <Link href="/?m=guest" className="font-semibold underline underline-offset-2" style={{ color: ACCENT }}>
              gastenportaal
            </Link>
            .
          </p>
        </div>

        {/* Duidelijke keuze: inloggen / wachtwoord vergeten / account aanmaken. */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {modeTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchMode(t.id)}
              aria-pressed={mode === t.id}
              className="rounded-lg px-1 py-2.5 text-center text-[12.5px] font-semibold leading-tight"
              style={
                mode === t.id
                  ? { background: CTA_BG, color: CTA_TEXT }
                  : { color: TEXT_SOFT, border: `1px solid ${LINE}`, background: CARD }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className="mt-4 rounded-xl px-4 py-5 shadow-sm"
          style={{ background: CARD, border: `1px solid ${LINE}` }}
        >
          {err ? (
            <p
              className="m-0 mb-3 rounded-lg px-3 py-2 text-[13px]"
              style={{ background: '#fbeae7', border: '1px solid #e5b3aa', color: '#8f2318' }}
            >
              {err}
            </p>
          ) : null}

          {mode === 'login' ? (
            <form onSubmit={onLogin}>
              <h2 className="m-0 font-serif text-[19px] font-semibold" style={{ color: TEXT }}>
                Inloggen
              </h2>
              <input
                className={inputClass}
                style={inputStyle}
                type="text"
                autoComplete="username"
                placeholder="E-mailadres of gebruikersnaam"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className={inputClass}
                style={inputStyle}
                type="password"
                autoComplete="current-password"
                placeholder="Wachtwoord"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                minLength={6}
              />
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px]" style={{ color: TEXT_SOFT }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 accent-[#8a6a3b]"
                />
                Aangemeld blijven
              </label>
              <button
                type="submit"
                disabled={busy}
                className="mt-4 w-full rounded-lg py-3 text-[15px] font-bold disabled:opacity-60"
                style={{ background: CTA_BG, color: CTA_TEXT }}
              >
                {busy ? 'Bezig…' : 'Inloggen'}
              </button>
            </form>
          ) : null}

          {mode === 'forgot' ? (
            <form onSubmit={onForgot}>
              <h2 className="m-0 font-serif text-[19px] font-semibold" style={{ color: TEXT }}>
                Wachtwoord vergeten
              </h2>
              <p className="m-0 mt-1.5 text-[13px] leading-snug" style={{ color: TEXT_SOFT }}>
                Vul uw e-mailadres of gebruikersnaam in; u ontvangt een e-mail om een nieuw
                wachtwoord in te stellen.
              </p>
              {forgotMsg ? (
                <p
                  className="m-0 mt-3 rounded-lg px-3 py-2 text-[13px]"
                  style={{ background: '#e9f4ec', border: '1px solid #a9d3b4', color: '#1f6b34' }}
                  role="status"
                >
                  {forgotMsg}
                </p>
              ) : (
                <>
                  <input
                    className={inputClass}
                    style={inputStyle}
                    type="text"
                    autoComplete="username"
                    placeholder="E-mailadres of gebruikersnaam"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-4 w-full rounded-lg py-3 text-[15px] font-bold disabled:opacity-60"
                    style={{ background: CTA_BG, color: CTA_TEXT }}
                  >
                    {busy ? 'Bezig…' : 'Verstuur e-mail'}
                  </button>
                </>
              )}
            </form>
          ) : null}

          {mode === 'register' ? (
            <form onSubmit={onRegister}>
              <h2 className="m-0 font-serif text-[19px] font-semibold" style={{ color: TEXT }}>
                Account aanmaken
              </h2>
              <p className="m-0 mt-1.5 text-[13px] leading-snug" style={{ color: TEXT_SOFT }}>
                Alleen voor modellen met een contract bij Class-Models.
              </p>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="Voornaam"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                required
              />
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="Achternaam"
                value={last}
                onChange={(e) => setLast(e.target.value)}
                required
              />
              <input
                className={inputClass}
                style={inputStyle}
                type="email"
                autoComplete="email"
                placeholder="E-mailadres"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className={inputClass}
                style={inputStyle}
                type="email"
                autoComplete="email"
                placeholder="E-mailadres opnieuw"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
                required
              />
              <input
                className={inputClass}
                style={inputStyle}
                type="tel"
                autoComplete="tel"
                placeholder="Telefoon (optioneel)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                className={inputClass}
                style={inputStyle}
                type="password"
                autoComplete="new-password"
                placeholder="Wachtwoord"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                minLength={6}
              />
              <input
                className={inputClass}
                style={inputStyle}
                type="password"
                autoComplete="new-password"
                placeholder="Wachtwoord opnieuw"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={busy}
                className="mt-4 w-full rounded-lg py-3 text-[15px] font-bold disabled:opacity-60"
                style={{ background: CTA_BG, color: CTA_TEXT }}
              >
                {busy ? 'Bezig…' : 'Account aanmaken'}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function MobileBeginHome() {
  const searchParams = useSearchParams();
  const view = searchParams.get('m');
  /** null = nog niet bepaald; true = introfilm tonen; false = meteen beginbeeld. */
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    // Alleen op het echte beginbeeld (geen ?m=guest of ?m=model).
    if (view !== null) {
      setShowIntro(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (sessionStorage.getItem(INTRO_SEEN_KEY) === '1') {
          if (!cancelled) setShowIntro(false);
          return;
        }
      } catch {
        if (!cancelled) setShowIntro(false);
        return;
      }
      // Geen / kapotte introfilm → meteen startscherm (anders blijft gsm op zwart hangen).
      try {
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(`${ASSET_BASE}/videos/mobile-intro.mp4`, {
          method: 'HEAD',
          signal: ctrl.signal,
          cache: 'no-store',
        });
        window.clearTimeout(timer);
        if (!cancelled) setShowIntro(res.ok);
      } catch {
        if (!cancelled) setShowIntro(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);

  const onIntroDone = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      /**/
    }
    setShowIntro(false);
  }, []);

  // Wacht tot we weten of de intro moet — voorkomt flits van het beginbeeld.
  if (view === null && showIntro === null) {
    return <div className="min-h-[100dvh] w-full bg-black" aria-hidden />;
  }

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: BG, color: TEXT }}>
      {view === null && showIntro ? <MobileIntroOverlay onDone={onIntroDone} /> : null}
      {view === 'guest' ? <GuestView /> : view === 'model' ? <ModelView /> : <StartView />}
    </div>
  );
}
