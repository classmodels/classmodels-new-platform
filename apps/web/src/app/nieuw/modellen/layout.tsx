import { Suspense, type ReactNode } from 'react';

export default function NieuwModellenLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="nieuw-wrap" style={{ padding: '48px 0' }}>Laden…</div>}>{children}</Suspense>;
}
