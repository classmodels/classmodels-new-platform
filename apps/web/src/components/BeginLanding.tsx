'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CmText } from '@/components/CmText';
import { useAuth } from '@/context/auth-context';
import { useI18n } from '@/i18n/context';
import { applyPostLoginRedirect } from '@/lib/redirect-after-auth';
import { apiFetch } from '@/lib/api';

type Tab = 'model' | 'guest' | 'client' | 'photographer';
type SubMode = 'login' | 'register' | 'forgot';

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
      className="absolute cursor-pointer bg-transparent outline-none"
      style={style}
    />
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

  // Geïntegreerd modellen-scherm op de muur (login, registratie, wachtwoord vergeten).
  const showModelScene = tab === 'model';
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
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

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

  const onModelForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setForgotMsg(null);
    setForgotSent(false);
    setBusy(true);
    try {
      const res = await apiFetch<{ message?: string; emailSent?: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      setForgotMsg(
        res.message ??
          'Als er een account is, ontvang je een e-mail met instructies. Controleer ook je spamfolder.',
      );
      setForgotSent(res.emailSent === true);
    } catch (er) {
      setErr(parseApiError(er, t('common.errorGeneric')));
    } finally {
      setBusy(false);
    }
  };

  const switchModelPanel = (mode: SubMode) => {
    setSubMode(mode);
    setErr(null);
    setForgotMsg(null);
    setForgotSent(false);
  };

  const wallInputClass =
    'mt-[1vw] h-[3vw] w-full shrink-0 rounded-[0.5vw] border border-white/15 bg-black/35 px-[1.2vw] text-[1.02vw] text-white outline-none placeholder:text-white/40 focus:border-amber-200/45';
  const wallBtnClass =
    'mt-[1.3vw] h-[3.3vw] w-full shrink-0 rounded-[0.5vw] bg-black text-[1.1vw] font-semibold text-white transition hover:bg-zinc-900 disabled:opacity-60';
  const wallLinkClass =
    'mt-[1vw] shrink-0 text-left text-[0.92vw] text-white/85 underline underline-offset-2 hover:text-white';

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
        <div className="relative w-full">
          <div className="relative aspect-[1024/576] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/begin-lobby.jpg"
              alt="Class-Models receptie met deuren naar het klanten-, modellen- en gastenportaal"
              className="absolute inset-0 h-full w-full select-none object-contain"
              draggable={false}
            />
            <DoorButton
              label="Modellenportaal"
              onClick={() => openPortalDoor('model')}
              style={{ left: '55.3%', top: '15%', width: '37.8%', height: '13.5%' }}
            />
            <DoorButton
              label="Gastenportaal"
              onClick={goGuest}
              style={{ left: '55.3%', top: '31.5%', width: '37.8%', height: '13.5%' }}
            />
            <DoorButton
              label="Klantenportaal"
              onClick={() => openPortalDoor('client')}
              style={{ left: '55.3%', top: '48.5%', width: '37.8%', height: '13.5%' }}
            />
            <DoorButton
              label="Fotograaf portaal"
              onClick={() => {
                setTab('photographer');
                setSubMode('login');
                setErr(null);
              }}
              style={{ left: '55.3%', top: '65.5%', width: '37.8%', height: '13.5%' }}
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
            <div className="relative w-full">
              <div className="relative aspect-[1024/576] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/begin-login-model.jpg"
                  alt="Inloggen als model bij Class-Models"
                  className="absolute inset-0 h-full w-full select-none object-contain"
                  draggable={false}
                />

                {/* Modellenformulier op het verlichte paneel — scrollbaar, uniform tot ingelogd. */}
                <div
                  className="absolute overflow-x-hidden overflow-y-auto bg-transparent px-[2.2vw] py-[1.6vw] text-white [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin]"
                  style={{ left: '57.5%', top: '22%', width: '33%', height: '48.5%' }}
                >
                  {subMode === 'login' ? (
                    <form
                      onSubmit={onModelLogin}
                      className="flex min-h-full flex-col justify-center"
                    >
                      <h2 className="font-serif text-[1.7vw] font-semibold leading-tight text-white">
                        <CmText contentKey="begin.modelLoginTitle" as="span" fallback={t('begin.modelLoginTitle')} />
                      </h2>
                      <CmText
                        contentKey="begin.modelLoginHint"
                        as="p"
                        className="mt-[0.8vw] text-[0.92vw] leading-snug text-white/60"
                        fallback={t('begin.modelLoginHint')}
                      />
                      {err ? <p className="mt-[0.8vw] text-[0.9vw] text-red-300">{err}</p> : null}
                      <input
                        type="text"
                        autoComplete="username"
                        aria-label={t('auth.identifier')}
                        placeholder={t('auth.identifier')}
                        value={mEmail}
                        onChange={(e) => setMEmail(e.target.value)}
                        required
                        className={`${wallInputClass} mt-[1.1vw]`}
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
                        className={wallInputClass}
                      />
                      <div className="mt-[1vw] flex shrink-0 items-center justify-between text-[0.9vw] text-white/80">
                        <label className="flex cursor-pointer items-center gap-[0.5vw]">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-[0.95vw] w-[0.95vw] rounded border-white/40 accent-amber-300"
                          />
                          {t('auth.rememberMe')}
                        </label>
                        <button
                          type="button"
                          onClick={() => switchModelPanel('forgot')}
                          className="text-white underline underline-offset-2 hover:text-white/90"
                        >
                          {t('auth.forgotPassword')}
                        </button>
                      </div>
                      <button type="submit" disabled={busy} className={wallBtnClass}>
                        <CmText contentKey="begin.modelLoginBtn" as="span" fallback={t('begin.modelLoginBtn')} />
                      </button>
                      <button type="button" onClick={() => switchModelPanel('register')} className={wallLinkClass}>
                        <CmText contentKey="begin.noAccount" as="span" fallback={t('begin.noAccount')} />
                      </button>
                    </form>
                  ) : null}

                  {subMode === 'register' ? (
                    <form onSubmit={onModelRegister} className="flex flex-col pb-[1vw]">
                      <h2 className="font-serif text-[1.7vw] font-semibold leading-tight text-white">
                        <CmText
                          contentKey="begin.modelRegisterTitle"
                          as="span"
                          fallback={t('begin.modelRegisterTitle')}
                        />
                      </h2>
                      <CmText
                        contentKey="begin.modelLoginHint"
                        as="p"
                        className="mt-[0.8vw] text-[0.92vw] leading-snug text-white/60"
                        fallback={t('begin.modelLoginHint')}
                      />
                      {err ? <p className="mt-[0.8vw] text-[0.9vw] text-red-300">{err}</p> : null}
                      <input
                        className={`${wallInputClass} mt-[1.1vw]`}
                        placeholder={t('begin.firstName')}
                        value={mFirst}
                        onChange={(e) => setMFirst(e.target.value)}
                        required
                      />
                      <input
                        className={wallInputClass}
                        placeholder={t('begin.lastName')}
                        value={mLast}
                        onChange={(e) => setMLast(e.target.value)}
                        required
                      />
                      <input
                        className={wallInputClass}
                        type="email"
                        autoComplete="email"
                        placeholder={t('begin.email')}
                        value={mEmail}
                        onChange={(e) => setMEmail(e.target.value)}
                        required
                      />
                      <input
                        className={wallInputClass}
                        type="email"
                        autoComplete="email"
                        placeholder={t('begin.emailRepeat')}
                        value={mEmail2}
                        onChange={(e) => setMEmail2(e.target.value)}
                        required
                      />
                      <input
                        className={wallInputClass}
                        type="tel"
                        autoComplete="tel"
                        placeholder={t('begin.phoneOptional')}
                        value={mPhone}
                        onChange={(e) => setMPhone(e.target.value)}
                      />
                      <input
                        className={wallInputClass}
                        type="password"
                        autoComplete="new-password"
                        placeholder={t('auth.password')}
                        value={mPass}
                        onChange={(e) => setMPass(e.target.value)}
                        required
                        minLength={6}
                      />
                      <input
                        className={wallInputClass}
                        type="password"
                        autoComplete="new-password"
                        placeholder={t('begin.passwordRepeat')}
                        value={mPass2}
                        onChange={(e) => setMPass2(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button type="submit" disabled={busy} className={wallBtnClass}>
                        <CmText contentKey="begin.modelRegisterBtn" as="span" fallback={t('begin.modelRegisterBtn')} />
                      </button>
                      <button type="button" onClick={() => switchModelPanel('login')} className={wallLinkClass}>
                        <CmText contentKey="begin.hasAccount" as="span" fallback={t('begin.hasAccount')} />
                      </button>
                    </form>
                  ) : null}

                  {subMode === 'forgot' ? (
                    <div className="flex min-h-full flex-col justify-center">
                      <h2 className="font-serif text-[1.7vw] font-semibold leading-tight text-white">
                        {t('password.forgotTitle')}
                      </h2>
                      <p className="mt-[0.8vw] text-[0.92vw] leading-snug text-white/60">{t('password.forgotHint')}</p>
                      {forgotMsg ? (
                        <div
                          className={`mt-[1vw] rounded-[0.5vw] border px-[1.2vw] py-[1vw] text-[0.9vw] ${
                            forgotSent
                              ? 'border-green-400/40 bg-green-950/40 text-green-200'
                              : 'border-white/20 bg-black/35 text-white/85'
                          }`}
                          role="status"
                        >
                          {forgotMsg}
                        </div>
                      ) : null}
                      {err ? <p className="mt-[0.8vw] text-[0.9vw] text-red-300">{err}</p> : null}
                      {!forgotMsg ? (
                        <form onSubmit={onModelForgotPassword}>
                          <input
                            type="text"
                            autoComplete="username"
                            aria-label={t('auth.identifier')}
                            placeholder={t('auth.identifier')}
                            value={forgotIdentifier}
                            onChange={(e) => setForgotIdentifier(e.target.value)}
                            required
                            className={`${wallInputClass} mt-[1.1vw]`}
                          />
                          <button type="submit" disabled={busy} className={wallBtnClass}>
                            {busy ? t('common.loading') : t('password.send')}
                          </button>
                        </form>
                      ) : null}
                      <button type="button" onClick={() => switchModelPanel('login')} className={wallLinkClass}>
                        <CmText contentKey="begin.hasAccount" as="span" fallback={t('begin.hasAccount')} />
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Terug naar de lobby. */}
                <button
                  type="button"
                  onClick={() => {
                    setTab(null);
                    setSubMode('login');
                    setErr(null);
                    setForgotMsg(null);
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

          {tab === 'client' ? (
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
    </div>
  );
}
