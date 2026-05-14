'use client';

import { TryoutModeshowRegistrationsPanel } from '@/components/admin/TryoutModeshowRegistrationsPanel';
import { TRYOUT_MODESHOW_EDITION_SLUG } from '@/lib/tryout-modeshow-edition';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

export default function AdminTryoutModeshowPage() {
  const { token, can } = useAuth();

  if (!token) return <p className="text-sm text-zinc-600">Inloggen vereist.</p>;

  if (!can('admin.billing.read')) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-zinc-900">Try-out modeshow</h1>
        <p className="text-sm text-zinc-600">
          Geen toegang. Vereiste permissie: <code className="rounded bg-zinc-100 px-1 text-xs">admin.billing.read</code>{' '}
          (zelfde als Mollie-instellingen).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Try-out modeshow</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Overzicht van inschrijvingen, betalingen (Mollie) en modellen die geen deelname wensen. De modellen zelf
          schrijven zich in via het{' '}
          <Link href="/portal/model?tab=tryout-modeshow" className="text-zinc-900 underline hover:text-zinc-700">
            modellenportaal
          </Link>
          ; deze pagina is alleen voor de backsite.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Prijs en Mollie-keys:{' '}
          <Link href="/admin/mollie" className="underline hover:text-zinc-800">
            Mollie-instellingen
          </Link>
          .
        </p>
      </div>

      <TryoutModeshowRegistrationsPanel token={token} editionSlug={TRYOUT_MODESHOW_EDITION_SLUG} />
    </div>
  );
}
