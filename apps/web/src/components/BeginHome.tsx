'use client';

import { BeginLiftExperience } from '@/components/BeginLiftExperience';
import { MobileBeginHome } from '@/components/MobileBeginHome';
import { useIsMobile } from '@/lib/use-is-mobile';

/**
 * Beginpagina-schakelaar: op de pc de volledige filmervaring (ongewijzigd),
 * op de gsm (site én app) de eenvoudige mobiele startpagina zonder films
 * of foto's.
 */
export function BeginHome() {
  const isMobile = useIsMobile();
  // Nog niet bekend (eerste render): op gsm licht, op pc zwart — zodat niets flitst.
  if (isMobile === null) return <div className="min-h-[60vh] bg-[#f1eee8] md:bg-black" />;
  return isMobile ? <MobileBeginHome /> : <BeginLiftExperience />;
}
