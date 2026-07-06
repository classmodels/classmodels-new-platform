import { Suspense } from 'react';
import { BeginLiftExperience } from '@/components/BeginLiftExperience';

/** Beginpagina: lift-film → liftknoppen → receptie-film → menubord met content op de rechtermuur. */
export default function BeginPage() {
  return (
    <Suspense fallback={null}>
      <BeginLiftExperience />
    </Suspense>
  );
}
