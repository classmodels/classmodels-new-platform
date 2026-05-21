'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiBase } from '@/lib/api';
import { CmText } from '@/components/CmText';

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
    <span className="text-amber-500" aria-label={`${c} van 5 sterren`}>
      {'★'.repeat(c)}
      <span className="text-zinc-300">{'★'.repeat(5 - c)}</span>
    </span>
  );
}

export default function ReviewsPage() {
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
    <div className="min-h-[100dvh] bg-panel text-ink">
      <main className="mx-auto w-full max-w-page px-4 py-10 md:px-6 md:py-14">
        <CmText
          contentKey="home.reviews.title"
          as="h1"
          className="font-serif text-3xl font-semibold text-burgundy md:text-4xl"
          fallback="Hoe onze modellen hun avontuur ervaren"
        />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Ervaringen van modellen en klanten bij Class-Models. Modellen kunnen een review plaatsen via het
          modellenportaal.
        </p>
        {loading ? (
          <p className="mt-10 text-sm text-muted">Reviews laden…</p>
        ) : items.length === 0 ? (
          <p className="mt-10 text-sm text-muted">Nog geen reviews beschikbaar.</p>
        ) : (
          <ul className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {items.map((r) => (
              <li key={r.id} className="mb-4 break-inside-avoid">
                <article className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <h2 className="font-semibold text-ink">{r.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-700">{r.body}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    {r.authorName ? (
                      <p className="text-xs font-semibold text-ink">— {r.authorName}</p>
                    ) : (
                      <span />
                    )}
                    {r.rating ? <Stars n={r.rating} /> : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-10">
          <Link href="/" className="text-sm text-burgundy hover:underline">
            ← Terug naar home
          </Link>
        </p>
      </main>
    </div>
  );
}
