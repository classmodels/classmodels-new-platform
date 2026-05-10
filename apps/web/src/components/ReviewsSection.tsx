'use client';

import { useEffect, useState } from 'react';
import { getApiBase } from '@/lib/api';
import { CmText } from '@/components/CmText';

type Review = {
  id: string;
  title: string;
  body: string;
  authorName?: string | null;
  rating?: number | null;
};

export function ReviewsSection() {
  const [items, setItems] = useState<Review[]>([]);

  useEffect(() => {
    fetch(`${getApiBase()}/reviews`)
      .then(async (r) => {
        if (!r.ok) return [];
        const data: unknown = await r.json();
        return Array.isArray(data) ? data : [];
      })
      .then((data) =>
        setItems(
          data.filter(
            (x): x is Review =>
              x != null &&
              typeof x === 'object' &&
              'id' in x &&
              'title' in x &&
              typeof (x as Review).id === 'string',
          ),
        ),
      )
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  return (
    <section className="mx-auto w-full max-w-page px-4 py-14 md:px-6">
      <CmText
        contentKey="home.reviews.title"
        as="h2"
        className="text-center font-serif text-2xl text-burgundy"
      />
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {items.map((r) => (
          <li
            key={r.id}
            className="rounded-cm border border-line bg-white p-5 text-sm shadow-sm"
          >
            <p className="font-medium text-ink">{r.title}</p>
            {r.rating ? (
              <p className="mt-1 text-xs text-muted">{''.padStart(r.rating, '★')}</p>
            ) : null}
            <p className="mt-2 leading-relaxed text-muted">{r.body}</p>
            {r.authorName ? (
              <p className="mt-3 text-xs text-muted">— {r.authorName}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
