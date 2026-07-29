import { Suspense } from 'react';
import { BeginHome } from '@/components/BeginHome';

/** Beginpagina → nieuwe site (/nieuw). */
export default function BeginPage() {
  return (
    <Suspense fallback={null}>
      <BeginHome />
    </Suspense>
  );
}
