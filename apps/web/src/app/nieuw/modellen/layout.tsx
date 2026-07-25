import { Suspense, type ReactNode } from 'react';

export default function NieuwModellenLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: '#0d0d11',
            color: '#a49d90',
            padding: '48px 0',
          }}
        >
          <div className="nieuw-wrap">Laden…</div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
