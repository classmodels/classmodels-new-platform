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
  const [companyType, setCompanyType] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [website, setWebsite] = useState('');
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
    if (!firstName.trim() || !lastName.trim()) {
      setError('Voornaam en naam zijn verplicht.');
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        clientProfile: {
          street: street.trim(),
          houseNumber: houseNumber.trim(),
          postalCode: postalCode.trim(),
          city: city.trim(),
          companyType: companyType.trim(),
          vatNumber: vatNumber.trim(),
          website: website.trim(),
        },
      });
      router.push('/klanten');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registreren mislukt.');
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, input: React.ReactNode) => (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span
        style={{
          display: 'block',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--n-dim)',
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {input}
    </label>
  );

  const inputStyle: CSSProperties = {
    width: '100%',
    background: '#0e0d0d',
    border: '1px solid rgba(214, 202, 182, 0.12)',
    color: 'var(--n-ink)',
    padding: '8px 10px',
    fontSize: 12.5,
    borderRadius: 2,
  };

  return (
    <NieuwShell portal="klanten">
      <section className="nieuw-sectie">
        <div className="nieuw-wrap" style={{ maxWidth: 720 }}>
          <span className="nieuw-label">Klantenportaal</span>
          <h1 className="nieuw-h1" style={{ fontSize: 'clamp(28px, 3.6vw, 42px)' }}>
            Nieuw <em>klantenaccount</em>
          </h1>
          <p className="nieuw-lead">
            Vul uw bedrijfsgegevens in. Deze verschijnen later automatisch in het boekingsformulier.
          </p>

          <form className="nieuw-panel" style={{ marginTop: 24 }} onSubmit={onSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              <div>
                {field(
                  'Naam *',
                  <input
                    style={inputStyle}
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />,
                )}
                {field(
                  'Voornaam *',
                  <input
                    style={inputStyle}
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />,
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 8 }}>
                  {field(
                    'Straat',
                    <input
                      style={inputStyle}
                      autoComplete="address-line1"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    />,
                  )}
                  {field(
                    'Nr.',
                    <input
                      style={inputStyle}
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                    />,
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
                  {field(
                    'Postcode',
                    <input
                      style={inputStyle}
                      autoComplete="postal-code"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />,
                  )}
                  {field(
                    'Gemeente',
                    <input
                      style={inputStyle}
                      autoComplete="address-level2"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />,
                  )}
                </div>
                {field(
                  'GSM',
                  <input
                    style={inputStyle}
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />,
                )}
              </div>

              <div>
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
                {field(
                  'Soort bedrijf',
                  <select
                    style={inputStyle}
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value)}
                  >
                    <option value="">— kies —</option>
                    <option value="kledingzaak">Kledingzaak</option>
                    <option value="reclamebureau">Reclamebureau</option>
                    <option value="andere">Andere</option>
                  </select>,
                )}
                {field(
                  'BTW-nummer',
                  <input
                    style={inputStyle}
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="BE 0123.456.789"
                  />,
                )}
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
                  'Website',
                  <input
                    style={inputStyle}
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                  />,
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
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
            </div>

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
