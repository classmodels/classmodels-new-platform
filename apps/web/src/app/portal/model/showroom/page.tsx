'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModelShowroomReference } from '@/components/model-portal/ModelShowroomReference';
import { MobileModelFiche } from '@/components/model-portal/MobileModelFiche';
import { useIsMobile } from '@/lib/use-is-mobile';

function ShowroomContent() {
  const searchParams = useSearchParams();
  const modelId = searchParams.get('model');
  const demo = searchParams.get('demo') !== '0' && !modelId;
  const isMobile = useIsMobile();

  // Op de gsm: gewone foto's en info in plaats van de (te kleine) 3D-showroom.
  if (isMobile === null) return null;
  if (isMobile) return <MobileModelFiche modelId={modelId} />;

  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-[#120608]">
      <ModelShowroomReference modelId={modelId} demo={demo} />
    </div>
  );
}

/** Modellenfiche — showroomruimte op de pc; leesbare fiche op de gsm. */
export default function ModelShowroomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-black text-sm text-white/60">
          Showroom laden…
        </div>
      }
    >
      <ShowroomContent />
    </Suspense>
  );
}
