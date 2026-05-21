'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

export function PremiumUpsellBanner({
  title = 'Premium modelaccount',
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
      <strong>{title}:</strong> {children}{' '}
      <Link href="/portal/model?tab=premium" className="font-semibold text-burgundy underline hover:text-burgundyDeep">
        Bekijk Premium
      </Link>
    </div>
  );
}

export function PremiumUpsellPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm">
      <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
      <Link
        href="/portal/model?tab=premium"
        className="mt-6 inline-flex rounded-full bg-burgundy px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-burgundyDeep"
      >
        Bekijk Premium
      </Link>
    </div>
  );
}
