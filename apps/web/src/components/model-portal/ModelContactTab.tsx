'use client';

import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';

type Props = {
  token: string;
  name: string;
  email: string;
  phone: string | null | undefined;
};

export function ModelContactTab({ token, name, email, phone }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    const sub = subject.trim();
    const msg = message.trim();
    if (sub.length < 2) {
      setError('Vul een onderwerp in.');
      return;
    }
    if (msg.length < 10) {
      setError('Schrijf een iets langer bericht (min. 10 tekens).');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/portal/model/contact', {
        method: 'POST',
        token,
        body: JSON.stringify({ subject: sub, message: msg }),
      });
      setOk(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Versturen mislukt.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nieuw-panel" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h2 className="model-contact-title" style={{ margin: 0, marginBottom: 8, textAlign: 'left' }}>
        Contacteer Class-Models
      </h2>

      <form onSubmit={(e) => void onSubmit(e)} style={{ marginTop: 36 }}>
        <div className="nieuw-form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <label className="nieuw-field nieuw-field-full">
            <span>Onderwerp</span>
            <input
              required
              maxLength={160}
              value={subject}
              disabled={busy}
              placeholder="Kort onderwerp van uw bericht"
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="nieuw-field nieuw-field-full">
            <span>Bericht</span>
            <textarea
              required
              rows={8}
              maxLength={8000}
              value={message}
              disabled={busy}
              placeholder="Schrijf hier uw bericht…"
              onChange={(e) => setMessage(e.target.value)}
              style={{ minHeight: 160, resize: 'vertical' }}
            />
          </label>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: '12px 14px',
            border: '1px solid var(--n-hair)',
            background: 'var(--n-bg)',
            fontSize: 12.5,
            color: 'var(--n-mut)',
            lineHeight: 1.55,
          }}
        >
          <p style={{ margin: 0, color: 'var(--n-gold)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Automatisch meegestuurd
          </p>
          <p style={{ margin: '8px 0 0' }}>
            <strong style={{ color: 'var(--n-ink)' }}>Naam:</strong> {name}
          </p>
          <p style={{ margin: '4px 0 0' }}>
            <strong style={{ color: 'var(--n-ink)' }}>GSM:</strong> {phone?.trim() || '—'}
          </p>
          <p style={{ margin: '4px 0 0' }}>
            <strong style={{ color: 'var(--n-ink)' }}>E-mail:</strong> {email}
          </p>
        </div>

        {error ? (
          <p style={{ marginTop: 14, color: '#c45c5c', fontSize: 13 }}>{error}</p>
        ) : null}
        {ok ? (
          <p style={{ marginTop: 14, color: 'var(--n-gold)', fontSize: 13 }}>
            Bericht verstuurd. Class-Models ontvangt het in de inbox.
          </p>
        ) : null}

        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="nieuw-btn" disabled={busy}>
            {busy ? 'Bezig…' : 'Bericht versturen'}
          </button>
        </div>
      </form>
    </div>
  );
}
