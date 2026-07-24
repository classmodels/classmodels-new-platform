'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { apiFetch } from '@/lib/api';

export default function NieuwWachtwoordVergetenPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setDone(true);
    } catch (err) {
      // Toon altijd een neutrale bevestiging als de endpoint bestaat; anders foutmelding.
      const msg = err instanceof Error ? err.message : 'Verzoek mislukt.';
      if (/404|not found/i.test(msg)) {
        setError(
          'Deze functie is lokaal nog niet beschikbaar. Gebruik het demo-account of registreer een nieuw account.',
        );
      } else {
        setDone(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <NieuwShell portal="modellen">
      <section className="nieuw-sectie">
        <div className="nieuw-wrap" style={{ maxWidth: 480 }}>
          <h1 className="nieuw-h1" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
            Wachtwoord <em>vergeten</em>
          </h1>
          <p className="nieuw-lead">
            Vul uw e-mailadres in. Als er een account bestaat, ontvangt u instructies om een nieuw
            wachtwoord in te stellen.
          </p>

          {done ? (
            <div className="nieuw-panel" style={{ marginTop: 28 }}>
              <p style={{ margin: 0, color: 'var(--n-mut)' }}>
                Als dit e-mailadres bij ons bekend is, ontvangt u zo een bericht. Controleer ook uw
                spammap.
              </p>
              <Link className="nieuw-btn" href="/nieuw/modellen" style={{ marginTop: 22 }}>
                Terug naar inloggen
              </Link>
            </div>
          ) : (
            <form className="nieuw-panel" style={{ marginTop: 28 }} onSubmit={onSubmit}>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--n-dim)',
                    marginBottom: 8,
                  }}
                >
                  E-mail
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--n-bg)',
                    border: '1px solid var(--n-hair)',
                    color: 'var(--n-ink)',
                    padding: '12px 14px',
                    fontSize: 14,
                  }}
                />
              </label>
              {error ? (
                <p style={{ color: '#e8a0a0', fontSize: 13, margin: '0 0 16px' }}>{error}</p>
              ) : null}
              <button
                className="nieuw-btn"
                type="submit"
                disabled={busy}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {busy ? 'Bezig…' : 'Verstuur link'}
              </button>
              <p style={{ marginTop: 18, fontSize: 13, color: 'var(--n-mut)' }}>
                <Link className="nieuw-link" href="/nieuw/modellen">
                  Terug naar inloggen
                </Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </NieuwShell>
  );
}
