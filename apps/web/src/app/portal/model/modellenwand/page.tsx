'use client';

import { ModelShowroomModelsWall } from '@/components/model-portal/ModelShowroomModelsWall';
import { MobileModelsList } from '@/components/model-portal/MobileModelsList';
import { useIsMobile } from '@/lib/use-is-mobile';

/** Modellenwand — alle modellen; op de gsm een gewone, leesbare lijst. */
export default function ModellenwandPage() {
  const isMobile = useIsMobile();
  if (isMobile === null) return null;
  if (isMobile) return <MobileModelsList />;

  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-[#120608]">
      <ModelShowroomModelsWall />
    </div>
  );
}
