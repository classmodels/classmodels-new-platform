'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BeginLiftExperience } from '@/components/BeginLiftExperience';
import { MobileBeginHome } from '@/components/MobileBeginHome';
import { useIsMobile } from '@/lib/use-is-mobile';

/**
 * Beginpagina-schakelaar:
 * - gsm: ongewijzigde mobiele startpagina
 * - desktop/tablet: nieuwe site (/nieuw)
 * - uitzondering: /?classic=1 toont de klassieke filmervaring
 */
export function BeginHome() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantClassic = searchParams.get('classic') === '1';

  useEffect(() => {
    if (isMobile === false && !wantClassic) {
      router.replace('/nieuw');
    }
  }, [isMobile, wantClassic, router]);

  // Nog niet bekend (eerste render): op gsm licht, op pc donker — zodat niets flitst.
  if (isMobile === null) {
    return <div className="min-h-[60vh] bg-[#f1eee8] md:bg-[#0d0d11]" />;
  }

  if (isMobile) return <MobileBeginHome />;
  if (wantClassic) return <BeginLiftExperience />;

  return <div className="min-h-[60vh] bg-[#0d0d11]" aria-hidden />;
}
