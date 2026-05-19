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

/** Donkere enterpagina: inloggen / registreren (eerste scherm van het platform). */
export function BeginLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextAfterLogin = searchParams.get('next');
  const { t } = useI18n();
  const { login, register: registerUser } = useAuth();
  const [tab, setTab] = useState<Tab>('model');

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

  const tabBtn = (id: Tab, contentKey: string, fallback: string) => {
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
        <CmText contentKey={contentKey} as="span" fallback={fallback} />
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
          <CmText
            contentKey="begin.title"
            as="h1"
            className="font-serif text-4xl font-semibold tracking-tight text-white md:text-5xl"
            fallback={t('begin.title')}
          />
          <CmText
            contentKey="begin.subtitle"
            as="p"
            className="mt-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/70"
            fallback={t('begin.subtitle')}
          />
          <CmText
            contentKey="begin.body"
            as="p"
            className="mt-8 text-sm leading-relaxed text-white/85"
            fallback={t('begin.body')}
          />
          <p className="mt-6 text-xs text-white/60">
            <CmText contentKey="begin.moreInfo" as="span" fallback={t('begin.moreInfo')} />{' '}
            <button
              type="button"
              onClick={() => router.push('/portal/guest')}
              className="text-white underline underline-offset-2 hover:text-white/90"
            >
              <CmText contentKey="begin.viewGuestPortal" as="span" fallback={t('begin.viewGuestPortal')} />
            </button>
            .
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center md:max-w-md">
          <div className="flex flex-col gap-2.5">
            {tabBtn('model', 'begin.tabModel', t('begin.tabModel'))}
            {tabBtn('guest', 'begin.tabGuest', t('begin.tabGuest'))}
            {tabBtn('client', 'begin.tabClient', t('begin.tabClient'))}
            {tabBtn('photographer', 'begin.tabPhotographer', t('begin.tabPhotographer'))}
          </div>

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
    </div>
  );
}
