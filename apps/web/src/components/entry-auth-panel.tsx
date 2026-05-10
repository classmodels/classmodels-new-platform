'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type AuthUser } from '@/context/auth-context';

export type EntryAuthTab = 'model' | 'guest' | 'client';
type SubMode = 'login' | 'register';

function redirectAfterAuth(u: AuthUser, router: ReturnType<typeof useRouter>) {
  const p = u.permissions ?? [];
  const toBackoffice = p.includes('*') || p.some((x) => x.startsWith('admin.'));
  const contentOnly = p.includes('content.strings.write') && !toBackoffice;
  if (toBackoffice) {
    router.replace('/admin/dashboard');
    return;
  }
  if (contentOnly) {
    router.replace('/admin/content');
    return;
  }
  router.replace('/');
}

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

export type EntryAuthPanelProps = {
  /** Sync met pillen in de rechter balk */
  activeTab?: EntryAuthTab;
  onActiveTabChange?: (t: EntryAuthTab) => void;
  /** Verbergt Model / Bezoeker / Klant-knoppen wanneer die al als pills buiten dit paneel staan */
  hidePortalTabs?: boolean;
};

export function EntryAuthPanel({
  activeTab: controlledTab,
  onActiveTabChange,
  hidePortalTabs,
}: EntryAuthPanelProps) {
  const router = useRouter();
  const { login, register: registerUser } = useAuth();
  const [innerTab, setInnerTab] = useState<EntryAuthTab>('model');
  const tab = controlledTab ?? innerTab;
  const setTab = useCallback(
    (t: EntryAuthTab) => {
      if (onActiveTabChange) onActiveTabChange(t);
      else setInnerTab(t);
    },
    [onActiveTabChange],
  );

  useEffect(() => {
    if (controlledTab != null) setInnerTab(controlledTab);
  }, [controlledTab]);

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
      redirectAfterAuth(u, router);
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
      redirectAfterAuth(u, router);
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
      redirectAfterAuth(u, router);
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
      redirectAfterAuth(u, router);
    } catch (er) {
      setErr(parseApiError(er));
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted outline-none ring-0 focus:border-burgundy/50 focus:ring-1 focus:ring-burgundy/20';

  const tabBtn = (id: EntryAuthTab, label: string) => {
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
        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
          active
            ? 'border-burgundy bg-burgundy text-white shadow-sm'
            : 'border-line bg-panel text-ink hover:border-burgundy/40'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className={`${hidePortalTabs ? '' : 'rounded-cm border border-line bg-white p-5 shadow-sm'}`}>
      {!hidePortalTabs ? (
        <div className="flex flex-wrap gap-2">
          {tabBtn('model', 'Model')}
          {tabBtn('guest', 'Bezoeker — model worden')}
          {tabBtn('client', 'Klant')}
        </div>
      ) : null}

      {tab === 'guest' ? (
        <div className={hidePortalTabs ? 'py-1' : 'mt-5'}>
          <h2 className="font-serif text-lg text-ink">Bezoekersportaal</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ontdek het platform als gast — zonder account. Je kunt later altijd nog registreren als model of klant.
          </p>
          <button
            type="button"
            onClick={goGuest}
            className="mt-4 w-full rounded-xl bg-burgundy py-2.5 text-sm font-semibold text-white hover:bg-burgundyDeep md:w-auto md:px-8"
          >
            Naar bezoekersportaal
          </button>
        </div>
      ) : null}

      {tab === 'model' ? (
        <div className={hidePortalTabs ? 'py-1' : 'mt-5'}>
          <h2 className="font-serif text-lg text-ink">
            {subMode === 'login' ? 'Inloggen als model' : 'Modelaccount aanmaken'}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Een modellenaccount is bedoeld voor modellen die met Class-Models samenwerken. Geen contract? Ga als
            bezoeker verder.
          </p>
          {err ? <p className="mt-2 text-xs text-danger">{err}</p> : null}

          {subMode === 'login' ? (
            <form className="mt-4 space-y-2.5" onSubmit={onModelLogin}>
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
                className="mt-1 w-full rounded-xl bg-burgundy py-2.5 text-sm font-semibold text-white hover:bg-burgundyDeep disabled:opacity-60"
              >
                Inloggen als model
              </button>
              <button
                type="button"
                className="w-full pt-1 text-center text-xs text-burgundy underline underline-offset-2 hover:text-burgundyDeep"
                onClick={() => {
                  setSubMode('register');
                  setErr(null);
                }}
              >
                Nog geen account? Maak hier één aan
              </button>
            </form>
          ) : (
            <form className="mt-4 space-y-2.5" onSubmit={onModelRegister}>
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
                className="mt-1 w-full rounded-xl bg-burgundy py-2.5 text-sm font-semibold text-white hover:bg-burgundyDeep disabled:opacity-60"
              >
                Account aanmaken en verder
              </button>
              <button
                type="button"
                className="w-full pt-1 text-center text-xs text-burgundy underline underline-offset-2"
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
      ) : null}

      {tab === 'client' ? (
        <div className={hidePortalTabs ? 'py-1' : 'mt-5'}>
          <h2 className="font-serif text-lg text-ink">
            {subMode === 'login' ? 'Inloggen als klant' : 'Klantaccount aanmaken'}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Beheer je opdrachten en communicatie met Class-Models vanuit één klantomgeving.
          </p>
          {err ? <p className="mt-2 text-xs text-danger">{err}</p> : null}

          {subMode === 'login' ? (
            <form className="mt-4 space-y-2.5" onSubmit={onClientLogin}>
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
                className="mt-1 w-full rounded-xl bg-burgundy py-2.5 text-sm font-semibold text-white hover:bg-burgundyDeep disabled:opacity-60"
              >
                Inloggen als klant
              </button>
              <button
                type="button"
                className="w-full pt-1 text-center text-xs text-burgundy underline underline-offset-2"
                onClick={() => {
                  setSubMode('register');
                  setErr(null);
                }}
              >
                Nog geen account? Maak hier één aan
              </button>
            </form>
          ) : (
            <form className="mt-4 space-y-2.5" onSubmit={onClientRegister}>
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
                className="mt-1 w-full rounded-xl bg-burgundy py-2.5 text-sm font-semibold text-white hover:bg-burgundyDeep disabled:opacity-60"
              >
                Account aanmaken en verder
              </button>
              <button
                type="button"
                className="w-full pt-1 text-center text-xs text-burgundy underline underline-offset-2"
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
  );
}
