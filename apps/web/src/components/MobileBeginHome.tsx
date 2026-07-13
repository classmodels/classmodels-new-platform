'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { applyPostLoginRedirect } from '@/lib/redirect-after-auth';
import { apiFetch } from '@/lib/api';

/**
 * Mobiele versie (gsm + app). Drie schermen, gestuurd met `?m=`:
 * - start (geen parameter): heel eenvoudig — kies Gastenportaal, Modellenportaal
 *   of Klantenportaal (nog niet aanklikbaar). Geen menu zichtbaar.
 * - `?m=guest`: het gastenportaal — "Maak snel een keuze" (gratis fotoshoot,
 *   casting, intake gesprek) en info model worden, met alleen het gastmenu.
 * - `?m=model`: het modellenportaal — duidelijk inloggen, wachtwoord vergeten
 *   of account aanmaken; alleen voor modellen met een contract.
 * De pc-versie (filmervaring) blijft volledig ongewijzigd.
 */

const GOLD = '#e9c780';
const GOLD_SOFT = 'rgba(233,199,128,0.55)';
const GOLD_LINE = 'rgba(233,199,128,0.28)';
const BG = '#0e0c0a';
const CARD = 'rgba(255,244,222,0.05)';
const TEXT = '#f2e8d5';
const TEXT_SOFT = 'rgba(242,232,213,0.72)';

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

const GUEST_MENU_LINKS: { label: string; href: string }[] = [
  { label: 'Gastenportaal (home)', href: '/?m=guest' },
  { label: 'Model worden', href: '/portal/guest' },
  { label: 'Gratis fotoshoot', href: '/portal/guest?p=gratis-fotoshoot' },
  { label: 'Casting', href: '/portal/guest?p=casting' },
  { label: 'Intake gesprek', href: '/portal/guest?p=intake-gesprek' },
  { label: 'Doelgroepen', href: '/portal/guest?p=doelgroepen' },
  { label: 'Veelgestelde vragen', href: '/portal/guest?p=veelgestelde-vragen' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Contact', href: '/portal/guest?p=contact' },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="m-0 mt-7 font-serif text-[13px] font-semibold uppercase tracking-[0.22em]"
      style={{ color: GOLD }}
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

/** Rij met '← Terug' en 'Beginpagina' — iets lager dan de app-balk. */
function BackRow() {
  const router = useRouter();
  return (
    <div className="mt-4 flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => {
          if (typeof window !== 'undefined' && window.history.length > 1) router.back();
          else router.push('/');
        }}
        className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
        style={{ color: TEXT, border: `1px solid ${GOLD_LINE}` }}
      >
        ← Terug
      </button>
      <Link
        href="/"
        className="rounded-full px-4 py-1.5 text-[13px] font-semibold"
        style={{ color: GOLD, border: `1px solid ${GOLD_SOFT}` }}
      >
        Beginpagina
      </Link>
    </div>
  );
}

/** Bovenbalk: logo, optioneel hamburger (alleen gastenportaal) en inloggen/uitloggen. */
function TopBar({ onMenu }: { onMenu?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header
      className="cm-appbar-safe sticky top-0 z-40"
      style={{ background: '#131314', borderBottom: `1px solid ${GOLD_LINE}` }}
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
              <span className="block h-[2px] w-5" style={{ background: GOLD }} />
              <span className="block h-[2px] w-5" style={{ background: GOLD }} />
              <span className="block h-[2px] w-5" style={{ background: GOLD }} />
            </span>
          </button>
        ) : (
          <span className="w-2" aria-hidden />
        )}
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
        ) : null}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Startscherm: drie portaalkeuzes, geen menu.                         */
/* ------------------------------------------------------------------ */

function StartView() {
  return (
    <>
      <TopBar />
      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10 pt-8">
        <h1 className="m-0 font-serif text-[27px] font-semibold leading-tight" style={{ color: TEXT }}>
          Welkom bij <span style={{ color: GOLD }}>Class-Models</span>
        </h1>
        <p className="m-0 mt-2 text-[14.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>
          Kies hieronder uw portaal.
        </p>

        <div className="mt-6 space-y-3.5">
          {/* Gastenportaal */}
          <Link
            href="/?m=guest"
            className="block rounded-xl px-4 py-4"
            style={{ background: CARD, border: `1px solid ${GOLD_SOFT}` }}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-serif text-[20px] font-semibold" style={{ color: GOLD }}>
                Gastenportaal
              </span>
              <span aria-hidden className="text-xl" style={{ color: GOLD_SOFT }}>
                ›
              </span>
            </span>
            <span className="mt-1 block text-[13.5px] leading-snug" style={{ color: TEXT_SOFT }}>
              Model worden? Klik hier — gratis fotoshoot, casting, intake gesprek en alle info.
            </span>
          </Link>

          {/* Modellenportaal */}
          <Link
            href="/?m=model"
            className="block rounded-xl px-4 py-4"
            style={{ background: CARD, border: `1px solid ${GOLD_LINE}` }}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-serif text-[20px] font-semibold" style={{ color: TEXT }}>
                Modellenportaal
              </span>
              <span aria-hidden className="text-xl" style={{ color: GOLD_SOFT }}>
                ›
              </span>
            </span>
            <span className="mt-1 block text-[13.5px] leading-snug" style={{ color: TEXT_SOFT }}>
              Alleen voor ingeschreven modellen met een contract bij Class-Models.
            </span>
          </Link>

          {/* Klantenportaal — zichtbaar maar nog niet aanklikbaar. */}
          <div
            aria-disabled="true"
            className="rounded-xl px-4 py-4"
            style={{ background: CARD, border: `1px solid ${GOLD_LINE}`, opacity: 0.55 }}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-serif text-[20px] font-semibold" style={{ color: TEXT }}>
                Klantenportaal
              </span>
            </span>
            <span className="mt-1 block text-[13.5px] leading-snug" style={{ color: TEXT_SOFT }}>
              Voor bedrijven en klanten — binnenkort beschikbaar.
            </span>
          </div>
        </div>

        <p className="m-0 mt-10 text-center text-[12px]" style={{ color: 'rgba(242,232,213,0.45)' }}>
          Class-Models — Provinciebaan 3, 2235 Hulshout
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Gastenportaal: maak snel een keuze + info, met gastmenu.            */
/* ------------------------------------------------------------------ */

function GuestView() {
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

  return (
    <>
      <TopBar onMenu={() => setOpen(true)} />

      {/* Overlay + inschuifmenu: alleen het gastmenu, plus de andere portalen. */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 ${
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
        style={{ background: '#131314', borderRight: `1px solid ${GOLD_LINE}` }}
      >
        <div className="cm-appbar-safe shrink-0" style={{ borderBottom: `1px solid ${GOLD_LINE}` }}>
          <div className="flex h-12 items-center justify-between gap-2 pl-4 pr-1">
            <p
              className="notranslate truncate font-serif text-[14px] font-semibold tracking-[0.14em]"
              style={{ color: GOLD }}
            >
              GASTENPORTAAL
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
          {GUEST_MENU_LINKS.map((m) => (
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
          {/* Andere portalen onderaan het menu. */}
          <Link
            href="/?m=model"
            className="flex items-center justify-between gap-2 px-4 py-3 text-[14.5px] font-semibold"
            style={{ color: GOLD, borderBottom: '1px solid rgba(233,199,128,0.14)', background: 'rgba(233,199,128,0.06)' }}
          >
            <span>Modellenportaal</span>
            <span aria-hidden style={{ color: GOLD_SOFT }}>
              ›
            </span>
          </Link>
          <div
            aria-disabled="true"
            className="flex items-center justify-between gap-2 px-4 py-3 text-[14.5px] font-semibold"
            style={{ color: TEXT_SOFT, borderBottom: '1px solid rgba(233,199,128,0.14)', opacity: 0.55 }}
          >
            <span>Klantenportaal (binnenkort)</span>
          </div>
        </nav>
      </aside>

      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10">
        <BackRow />

        <h1 className="m-0 mt-5 font-serif text-[25px] font-semibold leading-tight" style={{ color: TEXT }}>
          <span style={{ color: GOLD }}>Gastenportaal</span>
        </h1>
        <p className="m-0 mt-2 text-[14px] leading-relaxed" style={{ color: TEXT_SOFT }}>
          Hier vind je alle info om model te worden, kan je deelnemen aan een casting, een gratis
          testfotoshoot boeken of een intakegesprek plannen.
        </p>

        <SectionTitle>Maak snel een keuze</SectionTitle>
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

        <SectionTitle>Info model worden</SectionTitle>
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
  const { login, register: registerUser } = useAuth();
  const [mode, setMode] = useState<ModelMode>('login');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      applyPostLoginRedirect(u, router, {});
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
    background: 'rgba(255,244,222,0.06)',
    border: `1px solid ${GOLD_LINE}`,
    color: TEXT,
  };

  const modeTabs: { id: ModelMode; label: string }[] = [
    { id: 'login', label: 'Inloggen' },
    { id: 'forgot', label: 'Wachtwoord vergeten' },
    { id: 'register', label: 'Account aanmaken' },
  ];

  return (
    <>
      <TopBar />
      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10">
        <BackRow />

        <h1 className="m-0 mt-5 font-serif text-[25px] font-semibold leading-tight">
          <span style={{ color: GOLD }}>Modellenportaal</span>
        </h1>

        {/* Duidelijke vermelding: alleen voor modellen met een contract. */}
        <div
          className="mt-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(233,199,128,0.08)', border: `1px solid ${GOLD_SOFT}` }}
        >
          <p className="m-0 text-[13.5px] leading-snug" style={{ color: TEXT }}>
            <strong style={{ color: GOLD }}>Let op:</strong> alleen voor modellen met een contract
            bij Class-Models. Nog geen contract? Meld u dan aan via het{' '}
            <Link href="/?m=guest" className="font-semibold underline underline-offset-2" style={{ color: GOLD }}>
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
                  ? { background: GOLD, color: '#191510' }
                  : { color: TEXT_SOFT, border: `1px solid ${GOLD_LINE}` }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className="mt-4 rounded-xl px-4 py-5"
          style={{ background: CARD, border: `1px solid ${GOLD_LINE}` }}
        >
          {err ? (
            <p className="m-0 mb-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: 'rgba(180,35,24,0.18)', border: '1px solid rgba(180,35,24,0.45)', color: '#ffb4ab' }}>
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
                  className="h-4 w-4 accent-amber-300"
                />
                Aangemeld blijven
              </label>
              <button
                type="submit"
                disabled={busy}
                className="mt-4 w-full rounded-lg py-3 text-[15px] font-bold disabled:opacity-60"
                style={{ background: GOLD, color: '#191510' }}
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
                <p className="m-0 mt-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: 'rgba(21,147,74,0.15)', border: '1px solid rgba(21,147,74,0.45)', color: '#9be3b6' }} role="status">
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
                    style={{ background: GOLD, color: '#191510' }}
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
                style={{ background: GOLD, color: '#191510' }}
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

  return (
    <div className="min-h-[100dvh] w-full" style={{ background: BG }}>
      {view === 'guest' ? <GuestView /> : view === 'model' ? <ModelView /> : <StartView />}
    </div>
  );
}
