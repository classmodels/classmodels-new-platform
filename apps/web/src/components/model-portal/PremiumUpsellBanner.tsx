'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

export function PremiumUpsellBanner({
  title = 'Premium modelaccount',
  children,
  premiumHref = '/modellen?tab=premium',
}: {
  title?: string;
  children: ReactNode;
  premiumHref?: string;
}) {
  return (
    <div
      className="rounded-sm px-3 py-2.5 text-xs leading-relaxed"
      style={{
        border: '1px solid var(--n-gold-hair)',
        background: 'rgba(212, 175, 106, 0.12)',
        color: 'var(--n-ink)',
      }}
    >
      <strong>{title}:</strong> {children}{' '}
      <Link href={premiumHref} className="nieuw-link font-semibold">
        Word premium
      </Link>
    </div>
  );
}

export function PremiumUpsellPanel({
  title,
  body,
  premiumHref = '/modellen?tab=premium',
}: {
  title: string;
  body: string;
  premiumHref?: string;
}) {
  return (
    <div
      className="mx-auto max-w-lg rounded-sm px-6 py-10 text-center"
      style={{
        background: 'var(--n-bg-2)',
        border: '1px solid var(--n-hair)',
        color: 'var(--n-ink)',
      }}
    >
      <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--n-ink)' }}>
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--n-mut)' }}>
        {body}
      </p>
      <Link href={premiumHref} className="nieuw-btn mt-6 inline-flex">
        Word premium
      </Link>
    </div>
  );
}
