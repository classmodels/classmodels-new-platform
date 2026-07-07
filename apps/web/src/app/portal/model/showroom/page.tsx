'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModelShowroomReference } from '@/components/model-portal/ModelShowroomReference';

function ShowroomContent() {
  const searchParams = useSearchParams();
  const modelId = searchParams.get('model');
  const demo = searchParams.get('demo') !== '0' && !modelId;

  return <ModelShowroomReference modelId={modelId} demo={demo} />;
}

/** Modellenfiche — showroomruimte; blijft altijd onder de zwarte menubalk. */
export default function ModelShowroomPage() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-[#120608]">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-black text-sm text-white/60">
            Showroom laden…
          </div>
        }
      >
        <ShowroomContent />
      </Suspense>
    </div>
  );
}
