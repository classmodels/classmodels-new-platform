'use client';

import Link from 'next/link';
import { CmText } from '@/components/CmText';

/** Publiek gastenportaal (geen login vereist). */
export default function GuestPortalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <CmText
        contentKey="portal.guest.title"
        as="h1"
        className="font-serif text-2xl text-burgundy"
      />
      <CmText
        contentKey="portal.guest.intro"
        as="p"
        className="mt-2 text-sm leading-relaxed text-muted"
      />
      <CmText
        contentKey="portal.guest.body"
        as="p"
        className="mt-4 text-sm leading-relaxed text-ink/90"
      />
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link
          href="/login"
          className="rounded-cm bg-burgundy px-4 py-2 text-white shadow-sm hover:bg-burgundyDeep"
        >
          Inloggen
        </Link>
        <Link href="/portal/model" className="rounded-cm border border-line bg-white px-4 py-2 hover:bg-panel">
          Modellenportaal
        </Link>
        <Link href="/" className="text-burgundy hover:underline">
          ← Home
        </Link>
      </div>
    </div>
  );
}
