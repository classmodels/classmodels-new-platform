'use client';

import { ModelShowroomModelsWall } from '@/components/model-portal/ModelShowroomModelsWall';

/** Modellenwand — alle modellen op de muur; blijft altijd onder de zwarte menubalk. */
export default function ModellenwandPage() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-[#120608]">
      <ModelShowroomModelsWall />
    </div>
  );
}
