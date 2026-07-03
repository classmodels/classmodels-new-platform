'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModelShowroomReference } from '@/components/model-portal/ModelShowroomReference';

function GalleryContent() {
  const searchParams = useSearchParams();
  const modelId = searchParams.get('model');
  /** Zonder model-id: volledig ingevuld showcase-voorbeeld (localhost / demo). */
  const demo = searchParams.get('demo') !== '0' && !modelId;

  return <ModelShowroomReference modelId={modelId} demo={demo} />;
}

/** Modellenfiche — referentiefoto bijlage 1 + foto's in witte vlakken. */
export default function ModelGallery3DPage() {
  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col overflow-hidden bg-[#120608]">
      <div className="absolute left-4 top-4 z-[110] flex items-center gap-2">
        <Link
          href="/portal/model?tab=modellen"
          className="rounded-full border border-white/20 bg-black/50 px-3.5 py-1.5 text-xs text-white/90 backdrop-blur-sm transition hover:bg-black/70"
        >
          ← Terug
        </Link>
        <span className="hidden rounded-full border border-[#e8b88a]/30 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-wider text-[#e8b88a]/90 backdrop-blur-sm sm:inline">
          Showroom
        </span>
      </div>

      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-black text-sm text-white/60">
            Showroom laden…
          </div>
        }
      >
        <GalleryContent />
      </Suspense>
    </div>
  );
}
