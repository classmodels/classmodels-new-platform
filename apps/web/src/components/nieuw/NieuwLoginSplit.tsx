'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { useAuth } from '@/context/auth-context';
import { applyPostLoginRedirect } from '@/lib/redirect-after-auth';

type Side = 'model' | 'client';

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

function hasBackoffice(u: { permissions?: string[] }) {
  const p = u.permissions ?? [];
  return p.includes('*') || p.some((x) => x.startsWith('admin.'));
}

export function NieuwLoginSplit() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  const [modelId, setModelId] = useState('');
  const [modelPass, setModelPass] = useState('');
  const [modelRemember, setModelRemember] = useState(true);
  const [modelBusy, setModelBusy] = useState(false);
  const [modelErr, setModelErr] = useState<string | null>(null);

  const [clientEmail, setClientEmail] = useState('');
  const [clientPass, setClientPass] = useState('');
  const [clientRemember, setClientRemember] = useState(true);
  const [clientBusy, setClientBusy] = useState(false);
  const [clientErr, setClientErr] = useState<string | null>(null);

  const onLogin = async (side: Side, e: FormEvent) => {
    e.preventDefault();
    if (side === 'model') {
      setModelErr(null);
      setModelBusy(true);
      try {
        const u = await login(modelId.trim(), modelPass, { rememberMe: modelRemember });
        if (
          u.roles.includes('client') &&
          !u.roles.includes('model') &&
          !hasBackoffice(u)
        ) {
          setModelErr('Dit is een klantenaccount. Gebruik het formulier rechts.');
          return;
        }
        applyPostLoginRedirect(u, router, { next });
      } catch (err) {
        setModelErr(parseApiError(err, 'Inloggen als model mislukt.'));
      } finally {
        setModelBusy(false);
      }
      return;
    }

    setClientErr(null);
    setClientBusy(true);
    try {
      const u = await login(clientEmail.trim(), clientPass, { rememberMe: clientRemember });
      if (
        u.roles.includes('model') &&
        !u.roles.includes('client') &&
        !hasBackoffice(u)
      ) {
        setClientErr('Dit is een modellenaccount. Gebruik het formulier links.');
        return;
      }
      applyPostLoginRedirect(u, router, { next });
    } catch (err) {
      setClientErr(parseApiError(err, 'Inloggen als klant mislukt.'));
    } finally {
      setClientBusy(false);
    }
  };

  return (
    <NieuwShell portal="home" hidePortalNav={false}>
      <section className="nieuw-sectie" style={{ paddingTop: 36 }}>
        <div className="nieuw-wrap">
          <span className="nieuw-label">Account</span>
          <h1 className="nieuw-display nieuw-display-md">
            Kies hoe u <em>inlogt</em>
          </h1>
          <p className="nieuw-lead" style={{ marginTop: 14, maxWidth: '52ch' }}>
            Links voor modellen met een contract. Rechts voor bedrijven en klanten die castings
            en boekingen beheren.
          </p>

          <div className="nieuw-login-split">
            <article className="nieuw-panel nieuw-login-split-card">
              <span className="nieuw-label">Modellenportaal</span>
              <h2 className="nieuw-h3" style={{ marginTop: 8 }}>
                Inloggen als model
              </h2>
              <p className="nieuw-login-hint">
                Voor modellen die met Class-Models samenwerken.
              </p>
              {modelErr ? <p className="nieuw-login-err">{modelErr}</p> : null}
              <form className="nieuw-login-form" onSubmit={(e) => onLogin('model', e)}>
                <label className="nieuw-login-field">
                  <span>E-mail of telefoonnummer</span>
                  <input
                    type="text"
                    autoComplete="username"
                    required
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                  />
                </label>
                <label className="nieuw-login-field">
                  <span>Wachtwoord</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={modelPass}
                    onChange={(e) => setModelPass(e.target.value)}
                  />
                </label>
                <div className="nieuw-login-row">
                  <label className="nieuw-login-remember">
                    <input
                      type="checkbox"
                      checked={modelRemember}
                      onChange={(e) => setModelRemember(e.target.checked)}
                    />
                    <span>Wachtwoord onthouden</span>
                  </label>
                  <Link className="nieuw-link nieuw-login-forgot" href="/modellen/wachtwoord-vergeten">
                    Wachtwoord vergeten?
                  </Link>
                </div>
                <button
                  className="nieuw-btn"
                  type="submit"
                  disabled={modelBusy}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {modelBusy ? 'Bezig…' : 'Inloggen als model'}
                </button>
              </form>
              <div className="nieuw-login-meta">
                <p className="nieuw-login-register">
                  Nog geen account?
                  <Link className="nieuw-link" href="/modellen/registreren">
                    Maak hier één aan
                  </Link>
                </p>
              </div>
            </article>

            <article className="nieuw-panel nieuw-login-split-card">
              <span className="nieuw-label">Klantenportaal</span>
              <h2 className="nieuw-h3" style={{ marginTop: 8 }}>
                Inloggen als klant
              </h2>
              <p className="nieuw-login-hint">
                Beheer opdrachten en communicatie vanuit één klantomgeving.
              </p>
              {clientErr ? <p className="nieuw-login-err">{clientErr}</p> : null}
              <form className="nieuw-login-form" onSubmit={(e) => onLogin('client', e)}>
                <label className="nieuw-login-field">
                  <span>E-mailadres</span>
                  <input
                    type="email"
                    autoComplete="username"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </label>
                <label className="nieuw-login-field">
                  <span>Wachtwoord</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={clientPass}
                    onChange={(e) => setClientPass(e.target.value)}
                  />
                </label>
                <div className="nieuw-login-row">
                  <label className="nieuw-login-remember">
                    <input
                      type="checkbox"
                      checked={clientRemember}
                      onChange={(e) => setClientRemember(e.target.checked)}
                    />
                    <span>Wachtwoord onthouden</span>
                  </label>
                  <Link className="nieuw-link nieuw-login-forgot" href="/modellen/wachtwoord-vergeten">
                    Wachtwoord vergeten?
                  </Link>
                </div>
                <button
                  className="nieuw-btn"
                  type="submit"
                  disabled={clientBusy}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {clientBusy ? 'Bezig…' : 'Inloggen als klant'}
                </button>
              </form>
              <div className="nieuw-login-meta">
                <p className="nieuw-login-register">
                  Nog geen account?
                  <Link className="nieuw-link" href="/klanten/registreren">
                    Maak hier één aan
                  </Link>
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </NieuwShell>
  );
}
