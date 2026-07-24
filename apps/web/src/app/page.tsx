import { Suspense } from 'react';
import { BeginHome } from '@/components/BeginHome';

/**
 * Beginpagina: op de pc/tablet de nieuwe site (/nieuw),
 * op de gsm de ongewijzigde mobiele startpagina.
 */
export default function BeginPage() {
  return (
    <Suspense fallback={null}>
      <BeginHome />
    </Suspense>
  );
}
