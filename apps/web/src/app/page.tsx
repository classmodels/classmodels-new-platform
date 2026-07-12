import { Suspense } from 'react';
import { BeginHome } from '@/components/BeginHome';

/**
 * Beginpagina: op de pc de filmervaring (lift → hal → kamers), op de gsm de
 * eenvoudige mobiele startpagina zonder films of foto's.
 */
export default function BeginPage() {
  return (
    <Suspense fallback={null}>
      <BeginHome />
    </Suspense>
  );
}
