'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { useAuth } from '@/context/auth-context';

export function KlantRegistrerenForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!companyName.trim()) {
      setError('Bedrijfsnaam is verplicht voor een klantenaccount.');
      return;
    }
    if (password.length < 6) {
      setError('Kies een wachtwoord van minstens 6 tekens.');
      return;
    }
    if (password !== password2) {
      setError('De wachtwoorden komen niet overeen.');
      return;
    }
    setBusy(true);
    try {
      await register({
        role: 'client',
        email: email.trim(),
        password,
        companyName: companyName.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      router.push('/klanten');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registreren mislukt.');
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, input: React.ReactNode) => (
    <label style={{ display: 'block', marginBottom: 16 }}>
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
        {label}
      </span>
      {input}
    </label>
  );

  const inputStyle: CSSProperties = {
    width: '100%',
    background: 'var(--n-bg)',
    border: '1px solid var(--n-hair)',
    color: 'var(--n-ink)',
    padding: '12px 14px',
    fontSize: 14,
  };

  return (
    <NieuwShell portal="klanten">
      <section className="nieuw-sectie">
        <div className="nieuw-wrap" style={{ maxWidth: 520 }}>
          <span className="nieuw-label">Klantenportaal</span>
          <h1 className="nieuw-h1" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
            Nieuw <em>klantenaccount</em>
          </h1>
          <p className="nieuw-lead">
            Maak een account aan voor uw bedrijf. Dit account is enkel voor klanten: casting
            aanvragen, shortlists en boekingen — niet voor modellen.
          </p>

          <form className="nieuw-panel" style={{ marginTop: 28 }} onSubmit={onSubmit}>
            {field(
              'Bedrijfsnaam *',
              <input
                style={inputStyle}
                required
                autoComplete="organization"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />,
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {field(
                'Voornaam contactpersoon',
                <input
                  style={inputStyle}
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />,
              )}
              {field(
                'Achternaam contactpersoon',
                <input
                  style={inputStyle}
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />,
              )}
            </div>
            {field(
              'E-mail *',
              <input
                style={inputStyle}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />,
            )}
            {field(
              'Telefoon',
              <input
                style={inputStyle}
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />,
            )}
            {field(
              'Wachtwoord * (min. 6 tekens)',
              <input
                style={inputStyle}
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />,
            )}
            {field(
              'Wachtwoord herhalen *',
              <input
                style={inputStyle}
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />,
            )}

            {error ? (
              <p style={{ color: '#e8a0a0', fontSize: 13, margin: '0 0 16px' }}>{error}</p>
            ) : null}

            <button
              className="nieuw-btn"
              type="submit"
              disabled={busy}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {busy ? 'Bezig…' : 'Klantenaccount aanmaken'}
            </button>

            <p style={{ marginTop: 18, fontSize: 13, color: 'var(--n-mut)' }}>
              Heeft u al een klantenaccount?{' '}
              <Link className="nieuw-link" href="/inloggen">
                Inloggen
              </Link>
            </p>
          </form>
        </div>
      </section>
    </NieuwShell>
  );
}
