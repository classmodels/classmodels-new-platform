'use client';

import Link from 'next/link';
import { ModelShowroomModelsWall } from '@/components/model-portal/ModelShowroomModelsWall';

/** Modellenwand — alle modellen op de muur; blijft altijd onder de zwarte menubalk. */
export default function ModellenwandPage() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-[#120608]">
      <div className="absolute left-4 top-4 z-[110] flex items-center gap-2">
        <Link
          href="/portal/model?tab=home"
          className="rounded-full border border-white/20 bg-black/50 px-3.5 py-1.5 text-xs text-white/90 backdrop-blur-sm transition hover:bg-black/70"
        >
          ← Terug
        </Link>
        <span className="hidden rounded-full border border-[#e8b88a]/30 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-wider text-[#e8b88a]/90 backdrop-blur-sm sm:inline">
          Modellen
        </span>
      </div>

      <ModelShowroomModelsWall />
    </div>
  );
}
