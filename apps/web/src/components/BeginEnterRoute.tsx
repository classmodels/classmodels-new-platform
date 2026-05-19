'use client';

import { Suspense } from 'react';
import { BeginLanding } from '@/components/BeginLanding';

/** `/` — donkere enterpagina (intern: “enterpagina”). Ingelogde model/klant blijven hier; portaal via menu. */
export function BeginEnterRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-ink text-sm text-white/70">Laden…</div>
      }
    >
      <BeginLanding />
    </Suspense>
  );
}
