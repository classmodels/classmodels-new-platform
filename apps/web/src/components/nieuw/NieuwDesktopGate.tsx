'use client';

import type { ReactNode } from 'react';

/**
 * Nieuwe site is beschikbaar op desktop én gsm.
 * (Eerder: gsm werd teruggestuurd naar de klassieke startpagina.)
 */
export function NieuwDesktopGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
