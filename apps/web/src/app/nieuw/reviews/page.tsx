'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { getApiBase } from '@/lib/api';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

type Review = {
  id: string;
  title: string;
  body: string;
  authorName?: string | null;
  rating?: number | null;
};

function Stars({ n }: { n: number }) {
  const c = Math.min(5, Math.max(0, n));
  return (
    <span className="nieuw-stars" aria-label={`${c} van 5 sterren`}>
      <span className="on">{'★'.repeat(c)}</span>
      <span className="off">{'★'.repeat(5 - c)}</span>
    </span>
  );
}

export default function NieuwReviewsPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${getApiBase()}/reviews`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data: unknown) => setItems(Array.isArray(data) ? (data as Review[]) : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`${getApiBase()}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: name.trim(),
          title: title.trim(),
          body: body.trim(),
          rating,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Verzenden mislukt.');
      }
      setSent(true);
      setName('');
      setTitle('');
      setBody('');
      setRating(5);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Verzenden mislukt.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <NieuwShell portal="home">
      <section className="nieuw-sectie">
        <div className="nieuw-wrap">
          <div className="nieuw-reviews-top">
            <div>
              <span className="nieuw-label">Reviews</span>
              <h1 className="nieuw-h1" style={{ maxWidth: '14ch' }}>
                Ervaringen van onze <em>modellen</em>
              </h1>
              <p className="nieuw-lead">
                Echte verhalen van modellen en gasten bij Class-Models. Deel hier ook uw ervaring.
              </p>
              <p style={{ marginTop: 28 }}>
                <Link className="nieuw-link" href="/nieuw">
                  ← Terug naar begin
                </Link>
              </p>
            </div>

            <div className="nieuw-panel nieuw-review-form">
              <span className="nieuw-label">Uw review</span>
              <h2 className="nieuw-h3" style={{ marginTop: 6, fontSize: 24 }}>
                Schrijf een review
              </h2>
              {sent ? (
                <p className="nieuw-lead" style={{ marginTop: 16, maxWidth: 'none' }}>
                  Bedankt! We hebben uw review ontvangen.
                </p>
              ) : (
                <form className="nieuw-login-form" onSubmit={onSubmit} style={{ marginTop: 16 }}>
                  <label className="nieuw-login-field">
                    <span>Naam</span>
                    <input
                      required
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Uw voornaam"
                    />
                  </label>
                  <label className="nieuw-login-field">
                    <span>Titel</span>
                    <input
                      required
                      maxLength={120}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Bv. Geweldige ervaring"
                    />
                  </label>
                  <label className="nieuw-login-field">
                    <span>Uw ervaring</span>
                    <textarea
                      required
                      minLength={10}
                      maxLength={8000}
                      rows={5}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Schrijf hier uw ervaring…"
                      style={{
                        width: '100%',
                        background: 'var(--n-bg)',
                        border: '1px solid var(--n-hair)',
                        color: 'var(--n-ink)',
                        padding: '10px 12px',
                        fontSize: 13,
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </label>
                  <label className="nieuw-login-field">
                    <span>Score</span>
                    <select
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      style={{
                        width: '100%',
                        background: 'var(--n-bg)',
                        border: '1px solid var(--n-hair)',
                        color: 'var(--n-ink)',
                        padding: '10px 12px',
                        fontSize: 13,
                      }}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} sterren
                        </option>
                      ))}
                    </select>
                  </label>
                  {err ? <p className="nieuw-login-err">{err}</p> : null}
                  <button
                    className="nieuw-btn"
                    type="submit"
                    disabled={busy || body.trim().length < 10}
                    style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                  >
                    {busy ? 'Verzenden…' : 'Review verzenden'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="nieuw-reviews-list">
            <span className="nieuw-label">Gepubliceerde reviews</span>
            <h2 className="nieuw-display nieuw-display-md" style={{ marginTop: 4 }}>
              Wat anderen <em>zeggen</em>
            </h2>
            {loading ? (
              <p className="nieuw-lead" style={{ marginTop: 28 }}>
                Reviews laden…
              </p>
            ) : items.length === 0 ? (
              <p className="nieuw-lead" style={{ marginTop: 28 }}>
                Nog geen reviews beschikbaar.
              </p>
            ) : (
              <ul className="nieuw-reviews-grid">
                {items.map((r) => (
                  <li key={r.id}>
                    <article className="nieuw-panel nieuw-review-card">
                      <h3 className="nieuw-h3" style={{ fontSize: 22 }}>
                        {r.title}
                      </h3>
                      <p className="nieuw-lead" style={{ marginTop: 10, maxWidth: 'none' }}>
                        {r.body}
                      </p>
                      <div className="nieuw-review-meta">
                        {r.authorName ? <span className="auteur">— {r.authorName}</span> : <span />}
                        {r.rating ? <Stars n={r.rating} /> : null}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </NieuwShell>
  );
}
