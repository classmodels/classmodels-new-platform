'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Beginpagina: iedereen naar de nieuwe site.
 * Klassieke film/lobby-ervaring is uitgeschakeld.
 */
export function BeginHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/nieuw');
  }, [router]);

  return <div className="min-h-[60vh] bg-[#0d0d11]" aria-hidden />;
}
