'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetch(`${getApiBase()}/reviews`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data: unknown) => setItems(Array.isArray(data) ? (data as Review[]) : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <NieuwShell portal="home">
      <section className="nieuw-sectie">
        <div className="nieuw-wrap">
          <h1 className="nieuw-h1" style={{ maxWidth: '16ch' }}>
            Ervaringen van onze <em>modellen</em>
          </h1>
          <p className="nieuw-lead">
            Echte verhalen van modellen en gasten bij Class-Models. Modellen kunnen een review
            plaatsen via het modellenportaal.
          </p>

          {loading ? (
            <p className="nieuw-lead" style={{ marginTop: 40 }}>
              Reviews laden…
            </p>
          ) : items.length === 0 ? (
            <p className="nieuw-lead" style={{ marginTop: 40 }}>
              Nog geen reviews beschikbaar.
            </p>
          ) : (
            <ul className="nieuw-reviews-grid">
              {items.map((r) => (
                <li key={r.id}>
                  <article className="nieuw-panel nieuw-review-card">
                    <h2 className="nieuw-h3" style={{ fontSize: 22 }}>
                      {r.title}
                    </h2>
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

          <p style={{ marginTop: 40 }}>
            <Link className="nieuw-link" href="/nieuw">
              ← Terug naar begin
            </Link>
          </p>
        </div>
      </section>
    </NieuwShell>
  );
}
