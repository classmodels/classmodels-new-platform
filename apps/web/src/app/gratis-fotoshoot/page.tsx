import { Suspense } from 'react';
import { GratisFotoshootFilm } from '@/components/guest-portal/GratisFotoshootFilm';

/** Gratis fotoshoot: fotostudio-film in loop met de inhoud in de grote kader op de muur. */
export default function GratisFotoshootPage() {
  return (
    <Suspense fallback={null}>
      <GratisFotoshootFilm />
    </Suspense>
  );
}
