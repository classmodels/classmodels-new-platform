import { Suspense } from 'react';
import { GratisFotoshootFilm } from '@/components/guest-portal/GratisFotoshootFilm';

/** Gratis fotoshoot: achtergrond 6.png met info en agenda in de grote kader. */
export default function GratisFotoshootPage() {
  return (
    <Suspense fallback={null}>
      <GratisFotoshootFilm />
    </Suspense>
  );
}
