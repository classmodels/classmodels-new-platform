'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CmText } from '@/components/CmText';
import { useAuth } from '@/context/auth-context';
import { useI18n } from '@/i18n/context';
import { applyPostLoginRedirect } from '@/lib/redirect-after-auth';

type Tab = 'model' | 'guest' | 'client' | 'photographer';
type SubMode = 'login' | 'register';

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

/** Onzichtbare klikzone over een deur in de lobby-afbeelding (met subtiele hover-gloed). */
function DoorButton({
  label,
  onClick,
  style,
}: {
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group absolute cursor-pointer outline-none"
      style={style}
    >
      <span className="block h-full w-full rounded-[10px] bg-transparent shadow-none transition duration-300 ease-out group-hover:bg-[radial-gradient(ellipse_at_center,_rgba(255,210,170,0.16),_transparent_70%)] group-hover:shadow-[inset_0_0_30px_rgba(255,205,160,0.18)] group-focus-visible:bg-[radial-gradient(ellipse_at_center,_rgba(255,210,170,0.16),_transparent_70%)]" />
    </button>
  );
}

/** Donkere enterpagina: lobby-afbeelding met klikbare deuren naar de portalen. */
export function BeginLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextAfterLogin = searchParams.get('next');
  const { t } = useI18n();
  const { user, login, register: registerUser } = useAuth();
  const [tab, setTab] = useState<Tab | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'model' || tabParam === 'client' || tabParam === 'photographer') {
      setTab(tabParam);
      setSubMode('login');
    }
  }, [searchParams]);
  const [subMode, setSubMode] = useState<SubMode>('login');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Geïntegreerd modellen-login-scherm (afbeelding 4) dat zachtjes invloeit.
  const showModelScene = tab === 'model' && subMode === 'login';
  const [sceneShown, setSceneShown] = useState(false);
  useEffect(() => {
    if (!showModelScene) {
      setSceneShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setSceneShown(true));
    return () => cancelAnimationFrame(id);
  }, [showModelScene]);

  const [mEmail, setMEmail] = useState('');
  const [mPass, setMPass] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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

  const [fEmail, setFEmail] = useState('');
  const [fPass, setFPass] = useState('');

  const goGuest = useCallback(() => {
    router.push('/portal/guest');
  }, [router]);

  /** Deur model/klant: al ingelogd met die rol → meteen portaal; anders login tonen. */
  const openPortalDoor = useCallback(
    (role: 'model' | 'client') => {
      const isAdmin =
        user?.permissions?.includes('*') || user?.permissions?.some((x) => x.startsWith('admin.'));
      if (user && (user.roles.includes(role) || isAdmin)) {
        router.push(role === 'model' ? '/portal/model' : '/portal/client');
        return;
      }
      setTab(role);
      setSubMode('login');
      setErr(null);
    },
    [user, router],
  );

  const onPhotographerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = await login(fEmail.trim(), fPass, { rememberMe });
      applyPostLoginRedirect(u, router, { next: nextAfterLogin });
    } catch (er) {
      setErr(parseApiError(er, t('common.errorGeneric')));
    } finally {
      setBusy(false);
    }
  };

  const onModelLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = await login(mEmail.trim(), mPass, { rememberMe });
      applyPostLoginRedirect(u, router, { next: nextAfterLogin });
    } catch (er) {
      setErr(parseApiError(er, t('common.errorGeneric')));
    } finally {
      setBusy(false);
    }
  };

  const onModelRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (mEmail.trim().toLowerCase() !== mEmail2.trim().toLowerCase()) {
      setErr(t('auth.emailMismatch'));
      return;
    }
    if (mPass !== mPass2) {
      setErr(t('auth.passwordMismatch'));
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
      applyPostLoginRedirect(u, router, { next: nextAfterLogin, fromRegister: true });
    } catch (er) {
      setErr(parseApiError(er, t('common.errorGeneric')));
    } finally {
      setBusy(false);
    }
  };

  const onClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = await login(cEmail.trim(), cPass, { rememberMe });
      applyPostLoginRedirect(u, router, { next: nextAfterLogin });
    } catch (er) {
      setErr(parseApiError(er, t('common.errorGeneric')));
    } finally {
      setBusy(false);
    }
  };

  const onClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (cEmail.trim().toLowerCase() !== cEmail2.trim().toLowerCase()) {
      setErr(t('auth.emailMismatch'));
      return;
    }
    if (cPass !== cPass2) {
      setErr(t('auth.passwordMismatch'));
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
      applyPostLoginRedirect(u, router, { next: nextAfterLogin });
    } catch (er) {
      setErr(parseApiError(er, t('common.errorGeneric')));
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/25 bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-white/45 outline-none ring-0 focus:border-white/50';

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-ink text-white">
      {/* Lobby-afbeelding met klikbare deuren — de afbeelding zelf blijft exact dezelfde. */}
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="relative w-full max-w-[1500px]">
          <div className="relative aspect-[1024/576] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/begin-lobby.png"
              alt="Class-Models receptie met deuren naar het klanten-, modellen- en gastenportaal"
              className="absolute inset-0 h-full w-full select-none object-contain"
              draggable={false}
            />
            <DoorButton
              label="Klantenportaal"
              onClick={() => openPortalDoor('client')}
              style={{ left: '54.8%', top: '20%', width: '10.5%', height: '70%' }}
            />
            <DoorButton
              label="Modellenportaal"
              onClick={() => openPortalDoor('model')}
              style={{ left: '68%', top: '20%', width: '9.8%', height: '70%' }}
            />
            <DoorButton
              label="Gastenportaal"
              onClick={goGuest}
              style={{ left: '80%', top: '19%', width: '11.8%', height: '71%' }}
            />
          </div>
        </div>
      </div>

      {/* Modellen-login: vloeit zacht over naar de lobby met het login-paneel (afbeelding 4). */}
      {showModelScene ? (
        <div
          className={`fixed inset-0 z-50 bg-ink transition-opacity duration-500 ease-out ${
            sceneShown ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex min-h-[100dvh] items-center justify-center">
            <div className="relative w-full max-w-[1500px]">
              <div className="relative aspect-[1024/576] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/begin-login-model.png"
                  alt="Inloggen als model bij Class-Models"
                  className="absolute inset-0 h-full w-full select-none object-contain"
                  draggable={false}
                />

                {/* Eén volledig login-paneel, in het perspectief van de muur gekanteld. */}
                <div
                  className="absolute [perspective:1100px]"
                  style={{ left: '55.3%', top: '14%', width: '39%', height: '62%' }}
                >
                <form
                  onSubmit={onModelLogin}
                  className="absolute inset-0 flex flex-col justify-center rounded-2xl border border-amber-200/15 bg-[linear-gradient(160deg,_rgba(28,18,24,0.97),_rgba(18,11,16,0.98))] px-[5%] py-[4%] text-white shadow-[0_0_50px_rgba(255,170,130,0.16),inset_0_0_30px_rgba(255,170,130,0.05)] [transform:rotateY(-14deg)] [transform-origin:center]"
                >
                  <h2 className="font-serif text-[clamp(13px,2.1vw,26px)] font-semibold tracking-tight text-white">
                    <CmText contentKey="begin.modelLoginTitle" as="span" fallback={t('begin.modelLoginTitle')} />
                  </h2>
                  <CmText
                    contentKey="begin.modelLoginHint"
                    as="p"
                    className="mt-[1.5%] text-[clamp(8px,1.05vw,13px)] leading-snug text-white/60"
                    fallback={t('begin.modelLoginHint')}
                  />
                  {err ? (
                    <p className="mt-[2.5%] text-[clamp(8px,1vw,12px)] text-red-300">{err}</p>
                  ) : null}
                  <input
                    type="text"
                    autoComplete="username"
                    aria-label={t('auth.identifier')}
                    placeholder={t('auth.identifier')}
                    value={mEmail}
                    onChange={(e) => setMEmail(e.target.value)}
                    required
                    className="mt-[3.4%] h-[clamp(26px,5.6%,46px)] w-full rounded-lg border border-white/15 bg-black/35 px-[3.5%] text-[clamp(9px,1.15vw,14px)] text-white outline-none placeholder:text-white/40 focus:border-amber-200/45"
                  />
                  <input
                    type="password"
                    autoComplete="current-password"
                    aria-label={t('auth.password')}
                    placeholder={t('auth.password')}
                    value={mPass}
                    onChange={(e) => setMPass(e.target.value)}
                    required
                    minLength={6}
                    className="mt-[2.6%] h-[clamp(26px,5.6%,46px)] w-full rounded-lg border border-white/15 bg-black/35 px-[3.5%] text-[clamp(9px,1.15vw,14px)] text-white outline-none placeholder:text-white/40 focus:border-amber-200/45"
                  />
                  <div className="mt-[3%] flex items-center justify-between text-[clamp(8px,1vw,12.5px)] text-white/80">
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-3 w-3 rounded border-white/40 accent-amber-300"
                      />
                      {t('auth.rememberMe')}
                    </label>
                    <a
                      href="/wachtwoord-vergeten"
                      className="text-white underline underline-offset-2 hover:text-white/90"
                    >
                      {t('auth.forgotPassword')}
                    </a>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-[4%] h-[clamp(28px,6.4%,50px)] w-full rounded-lg bg-black text-[clamp(10px,1.25vw,15px)] font-semibold text-white transition hover:bg-zinc-900 disabled:opacity-60"
                  >
                    <CmText contentKey="begin.modelLoginBtn" as="span" fallback={t('begin.modelLoginBtn')} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubMode('register');
                      setErr(null);
                    }}
                    className="mt-[3.2%] text-left text-[clamp(8px,1.05vw,13px)] text-white/85 underline underline-offset-2 hover:text-white"
                  >
                    <CmText contentKey="begin.noAccount" as="span" fallback={t('begin.noAccount')} />
                  </button>
                </form>
                </div>

                {/* Terug naar de lobby. */}
                <button
                  type="button"
                  onClick={() => {
                    setTab(null);
                    setErr(null);
                  }}
                  className="absolute left-[2.5%] top-[5%] rounded-full bg-black/45 px-3 py-1 text-[clamp(9px,1.2vw,13px)] text-white/85 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
                >
                  ← Terug
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Centrale login-kaart: klanten-/fotograaf-login, en modellen-registratie. */}
      {tab && tab !== 'guest' && !showModelScene ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => {
                setTab(null);
                setErr(null);
              }}
              aria-label="Sluiten"
              className="absolute -top-3 -right-2 z-10 rounded-full bg-black/60 px-2.5 py-1 text-sm text-white/85 hover:text-white"
            >
              ✕
            </button>

          {tab === 'model' ? (
            <div className="mt-5 rounded-2xl border border-white/15 bg-black/35 p-6 shadow-2xl backdrop-blur-md">
              <CmText
                contentKey={subMode === 'login' ? 'begin.modelLoginTitle' : 'begin.modelRegisterTitle'}
                as="h2"
                className="font-serif text-xl text-white"
                fallback={subMode === 'login' ? t('begin.modelLoginTitle') : t('begin.modelRegisterTitle')}
              />
              <CmText
                contentKey="begin.modelLoginHint"
                as="p"
                className="mt-2 text-xs leading-relaxed text-white/75"
                fallback={t('begin.modelLoginHint')}
              />
              {err ? <p className="mt-3 text-xs text-red-200">{err}</p> : null}

              {subMode === 'login' ? (
                <form className="mt-5 space-y-3" onSubmit={onModelLogin}>
                  <input
                    className={inputClass}
                    type="text"
                    autoComplete="username"
                    placeholder={t('auth.identifier')}
                    value={mEmail}
                    onChange={(e) => setMEmail(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="password"
                    autoComplete="current-password"
                    placeholder={t('auth.password')}
                    value={mPass}
                    onChange={(e) => setMPass(e.target.value)}
                    required
                    minLength={6}
                  />
                  <label className="flex items-center gap-2 text-xs text-white/85">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-white/40"
                    />
                    {t('auth.rememberMe')}
                  </label>
                  <a
                    href="/wachtwoord-vergeten"
                    className="block text-left text-xs text-white/90 underline underline-offset-2 hover:text-white"
                  >
                    {t('auth.forgotPassword')}
                  </a>
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-2 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-60"
                  >
                    <CmText contentKey="begin.modelLoginBtn" as="span" fallback={t('begin.modelLoginBtn')} />
                  </button>
                  <button
                    type="button"
                    className="w-full pt-1 text-left text-xs text-white/90 underline underline-offset-2 hover:text-white"
                    onClick={() => {
                      setSubMode('register');
                      setErr(null);
                    }}
                  >
                    <CmText contentKey="begin.noAccount" as="span" fallback={t('begin.noAccount')} />
                  </button>
                </form>
              ) : (
                <form className="mt-5 space-y-3" onSubmit={onModelRegister}>
                  <input
                    className={inputClass}
                    placeholder={t('begin.firstName')}
                    value={mFirst}
                    onChange={(e) => setMFirst(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    placeholder={t('begin.lastName')}
                    value={mLast}
                    onChange={(e) => setMLast(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="email"
                    placeholder={t('begin.email')}
                    value={mEmail}
                    onChange={(e) => setMEmail(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="email"
                    placeholder={t('begin.emailRepeat')}
                    value={mEmail2}
                    onChange={(e) => setMEmail2(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    type="tel"
                    placeholder={t('begin.phoneOptional')}
                    value={mPhone}
                    onChange={(e) => setMPhone(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    type="password"
                    placeholder={t('auth.password')}
                    value={mPass}
                    onChange={(e) => setMPass(e.target.value)}
                    required
                    minLength={6}
                  />
                  <input
                    className={inputClass}
                    type="password"
                    placeholder={t('begin.passwordRepeat')}
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
                    <CmText contentKey="begin.modelRegisterBtn" as="span" fallback={t('begin.modelRegisterBtn')} />
                  </button>
                  <button
                    type="button"
                    className="w-full pt-1 text-left text-xs text-white/90 underline underline-offset-2"
                    onClick={() => {
                      setSubMode('login');
                      setErr(null);
                    }}
                  >
                    <CmText contentKey="begin.hasAccount" as="span" fallback={t('begin.hasAccount')} />
                  </button>
                </form>
              )}
            </div>
          ) : tab === 'client' ? (
            <div className="mt-5 rounded-2xl border border-white/15 bg-black/35 p-6 shadow-2xl backdrop-blur-md">
              <CmText
                contentKey={subMode === 'login' ? 'begin.clientLoginTitle' : 'begin.clientRegisterTitle'}
                as="h2"
                className="font-serif text-xl text-white"
                fallback={subMode === 'login' ? t('begin.clientLoginTitle') : t('begin.clientRegisterTitle')}
              />
              <CmText
                contentKey="begin.clientLoginHint"
                as="p"
                className="mt-2 text-xs leading-relaxed text-white/75"
                fallback={t('begin.clientLoginHint')}
              />
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
                    <CmText contentKey="begin.clientLoginBtn" as="span" fallback={t('begin.clientLoginBtn')} />
                  </button>
                  <button
                    type="button"
                    className="w-full pt-1 text-left text-xs text-white/90 underline underline-offset-2"
                    onClick={() => {
                      setSubMode('register');
                      setErr(null);
                    }}
                  >
                    <CmText contentKey="begin.noAccount" as="span" fallback={t('begin.noAccount')} />
                  </button>
                </form>
              ) : (
                <form className="mt-5 space-y-3" onSubmit={onClientRegister}>
                  <input
                    className={inputClass}
                    placeholder={t('begin.company')}
                    value={cCompany}
                    onChange={(e) => setCCompany(e.target.value)}
                    required
                  />
                  <input
                    className={inputClass}
                    placeholder={t('begin.contactFirstName')}
                    value={cFirst}
                    onChange={(e) => setCFirst(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder={t('begin.lastName')}
                    value={cLast}
                    onChange={(e) => setCLast(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    type="tel"
                    placeholder={t('begin.phone')}
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
                    <CmText contentKey="begin.modelRegisterBtn" as="span" fallback={t('begin.modelRegisterBtn')} />
                  </button>
                  <button
                    type="button"
                    className="w-full pt-1 text-left text-xs text-white/90 underline underline-offset-2"
                    onClick={() => {
                      setSubMode('login');
                      setErr(null);
                    }}
                  >
                    <CmText contentKey="begin.hasClientAccount" as="span" fallback={t('begin.hasClientAccount')} />
                  </button>
                </form>
              )}
            </div>
          ) : tab === 'photographer' ? (
            <div className="mt-5 rounded-2xl border border-white/15 bg-black/35 p-6 shadow-2xl backdrop-blur-md">
              <CmText
                contentKey="begin.photographerTitle"
                as="h2"
                className="font-serif text-xl text-white"
                fallback={t('begin.photographerTitle')}
              />
              <CmText
                contentKey="begin.photographerHint"
                as="p"
                className="mt-2 text-xs leading-relaxed text-white/75"
                fallback={t('begin.photographerHint')}
              />
              {err ? <p className="mt-3 text-xs text-red-200">{err}</p> : null}
              <form className="mt-5 space-y-3" onSubmit={onPhotographerLogin}>
                <input
                  className={inputClass}
                  type="email"
                  autoComplete="username"
                  placeholder={t('begin.photographerEmail')}
                  value={fEmail}
                  onChange={(e) => setFEmail(e.target.value)}
                  required
                />
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Wachtwoord"
                  value={fPass}
                  onChange={(e) => setFPass(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-60"
                >
                  <CmText contentKey="begin.photographerLoginBtn" as="span" fallback={t('begin.photographerLoginBtn')} />
                </button>
              </form>
            </div>
          ) : null}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setTab('photographer');
          setErr(null);
        }}
        className="fixed bottom-3 right-4 z-40 text-[11px] text-white/55 underline underline-offset-2 hover:text-white/90"
      >
        Fotograaf login
      </button>
    </div>
  );
}
