'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { redirectAfterPortalAuth } from '@/lib/redirect-after-auth';

type Tab = 'model' | 'guest' | 'client';
type SubMode = 'login' | 'register';

const LEFT_TITLE = 'Class-Models';
const LEFT_SUB = 'Modeling Agency';
const LEFT_BODY =
  'Dit platform is jouw persoonlijke omgeving binnen Class-Models, waar je op een stijlvolle en overzichtelijke manier alles beheert wat bij jouw carrière als model komt kijken. Raadpleeg je profiel, houd je portfolio up-to-date, bekijk opdrachten en blijf verbonden met het bureau.';

function parseApiError(err: unknown): string {
  if (!(err instanceof Error)) return 'Er ging iets mis.';
  try {
    const j = JSON.parse(err.message) as { message?: string | string[] };
    if (typeof j.message === 'string') return j.message;
    if (Array.isArray(j.message)) return j.message.join(', ');
  } catch {
    if (err.message && !err.message.startsWith('{')) return err.message;
  }
  return 'Er ging iets mis.';
}

/** Donkere enterpagina: inloggen / registreren (eerste scherm van het platform). */
export function BeginLanding() {
  const router = useRouter();
  const { login, register: registerUser } = useAuth();
  const [tab, setTab] = useState<Tab>('model');
  const [subMode, setSubMode] = useState<SubMode>('login');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [mEmail, setMEmail] = useState('');
  const [mPass, setMPass] = useState('');
  const [mEmail2, setMEmail2] = useState('');
  const [mPass2, setMPass2] = useState('');
  const [mFirst, setMFirst] = useState('');
  const [mLast, setMLast] = useState('');
  const [mPhone, setMPhone] = useState('');

  const [cEmail, setCEmail] = useState('');
  const [cPass, setCPass] = useState('');
  const [cEmail2, setCEmail2] = useState('');
  const [cPass2, setCPass2] = useState('');
  const [cFirst, setCFirst] = useState('');
  const [cLast, setCLast] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cPhone, setCPhone] = useState('');

  const goGuest = useCallback(() => {
    router.push('/portal/guest');
  }, [router]);

  const onModelLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = await login(mEmail.trim(), mPass);
      redirectAfterPortalAuth(u, router);
    } catch (er) {
      setErr(parseApiError(er));
    } finally {
      setBusy(false);
    }
  };

  const onModelRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (mEmail.trim().toLowerCase() !== mEmail2.trim().toLowerCase()) {
      setErr('E-mailadressen komen niet overeen.');
      return;
    }
    if (mPass !== mPass2) {
      setErr('Wachtwoorden komen niet overeen.');
      return;
    }
    setBusy(true);
    try {
      const u = await registerUser({
        role: 'model',
        email: mEmail.trim(),
        password: mPass,
        firstName: mFirst.trim(),
        lastName: mLast.trim(),
        phone: mPhone.trim() || undefined,
      });
      redirectAfterPortalAuth(u, router, { fromRegister: true });
    } catch (er) {
      setErr(parseApiError(er));
    } finally {
      setBusy(false);
    }
  };

  const onClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = await login(cEmail.trim(), cPass);
      redirectAfterPortalAuth(u, router);
    } catch (er) {
      setErr(parseApiError(er));
    } finally {
      setBusy(false);
    }
  };

  const onClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (cEmail.trim().toLowerCase() !== cEmail2.trim().toLowerCase()) {
      setErr('E-mailadressen komen niet overeen.');
      return;
    }
    if (cPass !== cPass2) {
      setErr('Wachtwoorden komen niet overeen.');
      return;
    }
    setBusy(true);
    try {
      const u = await registerUser({
        role: 'client',
        email: cEmail.trim(),
        password: cPass,
        firstName: cFirst.trim() || undefined,
        lastName: cLast.trim() || undefined,
        phone: cPhone.trim() || undefined,
        companyName: cCompany.trim(),
      });
      redirectAfterPortalAuth(u, router);
    } catch (er) {
      setErr(parseApiError(er));
    } finally {
      setBusy(false);
    }
  };

  const tabBtn = (id: Tab, label: string) => {
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => {
          if (id === 'guest') {
            goGuest();
            return;
          }
          setTab(id);
          setSubMode('login');
          setErr(null);
        }}
        className={`w-full rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition ${
          active
            ? 'border-white/25 bg-white/15 text-white shadow-inner'
            : 'border-white/45 bg-white/5 text-white/95 hover:border-white/60 hover:bg-white/10'
        }`}
      >
        {label}
      </button>
    );
  };

  const inputClass =
    'w-full rounded-xl border border-white/25 bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-white/45 outline-none ring-0 focus:border-white/50';

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-ink text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-burgundy/40 via-burgundy/12 to-ink"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-page flex-col gap-10 px-5 py-12 md:flex-row md:items-stretch md:gap-14 md:px-8 md:py-16 lg:gap-20">
        <div className="flex flex-1 flex-col justify-center md:max-w-md lg:max-w-lg">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-white md:text-5xl">{LEFT_TITLE}</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">{LEFT_SUB}</p>
          <p className="mt-8 text-sm leading-relaxed text-white/85">{LEFT_BODY}</p>
          <p className="mt-6 text-xs text-white/60">
            Meer info over model worden?{' '}
            <button
              type="button"
              onClick={() => router.push('/portal/guest')}
              className="text-white underline underline-offset-2 hover:text-white/90"
            >
              Bekijk het gastenportaal
            </button>
            .
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center md:max-w-md">
          <div className="flex flex-col gap-2.5">
            {tabBtn('model', 'Inloggen model / account aanmaken model')}
            {tabBtn('guest', 'Inloggen bezoekers / model worden')}
            {tabBtn('client', 'Inloggen klanten')}
          </div>

          {tab === 'model' ? (
            <div className="mt-5 rounded-2xl border border-white/15 bg-black/35 p-6 shadow-2xl backdrop-blur-md">
              <h2 className="font-serif text-xl text-white">
                {subMode === 'login' ? 'Inloggen als model' : 'Modelaccount aanmaken'}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-white/75">
                Een modellenaccount is bedoeld voor modellen die met Class-Models samenwerken. Geen contract? Log
                dan in als bezoeker.
              </p>
              {err ? <p className="mt-3 text-xs text-red-200">{err}</p> : null}

              {subMode === 'login' ? (
                <form className="mt-5 space-y-3" onSubmit={onModelLogin}>
                  <input
                    className={inputClass}
                    type="email"
                    autoComplete="username"
                    placeholder="E-mailadres"
                    value={mEmail}
                    onChange={(e) => setMEmail(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Wachtwoord"
                    value={mPass}
                    onChange={(e) => setMPass(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-2 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-60"
                  >
                    Inloggen als model
                  </button>
                  <button
                    type="button"
                    className="w-full pt-1 text-center text-xs text-white/90 underline underline-offset-2 hover:text-white"
                    onClick={() => {
                      setSubMode('register');
                      setErr(null);
                    }}
                  >
                    Nog geen account? Maak hier één aan
                  </button>
                </form>
              ) : (
                <form className="mt-5 space-y-3" onSubmit={onModelRegister}>
                  <input
                    className={inputClass}
                    placeholder="Voornaam"
                    value={mFirst}
                    onChange={(e) => setMFirst(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    placeholder="Familienaam"
                    value={mLast}
                    onChange={(e) => setMLast(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="email"
                    placeholder="E-mailadres"
                    value={mEmail}
                    onChange={(e) => setMEmail(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="email"
                    placeholder="E-mail opnieuw"
                    value={mEmail2}
                    onChange={(e) => setMEmail2(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="tel"
                    placeholder="Telefoon (optioneel)"
                    value={mPhone}
                    onChange={(e) => setMPhone(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    type="password"
                    placeholder="Wachtwoord"
                    value={mPass}
                    onChange={(e) => setMPass(e.target.value)}
                    required
                    minLength={6}
                  />
                  <input
                    className={inputClass}
                    type="password"
                    placeholder="Wachtwoord opnieuw"
                    value={mPass2}
                    onChange={(e) => setMPass2(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-2 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-60"
                  >
                    Account aanmaken en verder
                  </button>
                  <button
                    type="button"
                    className="w-full pt-1 text-center text-xs text-white/90 underline underline-offset-2"
                    onClick={() => {
                      setSubMode('login');
                      setErr(null);
                    }}
                  >
                    Ik heb al een account — inloggen
                  </button>
                </form>
              )}
            </div>
          ) : tab === 'client' ? (
            <div className="mt-5 rounded-2xl border border-white/15 bg-black/35 p-6 shadow-2xl backdrop-blur-md">
              <h2 className="font-serif text-xl text-white">
                {subMode === 'login' ? 'Inloggen als klant' : 'Klantaccount aanmaken'}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-white/75">
                Beheer je opdrachten en communicatie met Class-Models vanuit één klantomgeving.
              </p>
              {err ? <p className="mt-3 text-xs text-red-200">{err}</p> : null}

              {subMode === 'login' ? (
                <form className="mt-5 space-y-3" onSubmit={onClientLogin}>
                  <input
                    className={inputClass}
                    type="email"
                    autoComplete="username"
                    placeholder="E-mailadres"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Wachtwoord"
                    value={cPass}
                    onChange={(e) => setCPass(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-2 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-60"
                  >
                    Inloggen als klant
                  </button>
                  <button
                    type="button"
                    className="w-full pt-1 text-center text-xs text-white/90 underline underline-offset-2"
                    onClick={() => {
                      setSubMode('register');
                      setErr(null);
                    }}
                  >
                    Nog geen account? Maak hier één aan
                  </button>
                </form>
              ) : (
                <form className="mt-5 space-y-3" onSubmit={onClientRegister}>
                  <input
                    className={inputClass}
                    placeholder="Bedrijfsnaam / zaak"
                    value={cCompany}
                    onChange={(e) => setCCompany(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    placeholder="Voornaam contactpersoon"
                    value={cFirst}
                    onChange={(e) => setCFirst(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder="Familienaam"
                    value={cLast}
                    onChange={(e) => setCLast(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    type="tel"
                    placeholder="Telefoon"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    type="email"
                    placeholder="E-mailadres"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="email"
                    placeholder="E-mail opnieuw"
                    value={cEmail2}
                    onChange={(e) => setCEmail2(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="password"
                    placeholder="Wachtwoord"
                    value={cPass}
                    onChange={(e) => setCPass(e.target.value)}
                    required
                    minLength={6}
                  />
                  <input
                    className={inputClass}
                    type="password"
                    placeholder="Wachtwoord opnieuw"
                    value={cPass2}
                    onChange={(e) => setCPass2(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-2 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-60"
                  >
                    Account aanmaken en verder
                  </button>
                  <button
                    type="button"
                    className="w-full pt-1 text-center text-xs text-white/90 underline underline-offset-2"
                    onClick={() => {
                      setSubMode('login');
                      setErr(null);
                    }}
                  >
                    Ik heb al een klantaccount — inloggen
                  </button>
                </form>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
