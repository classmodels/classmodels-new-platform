import { Suspense, type ReactNode } from 'react';
import { NieuwDesktopGate } from '@/components/nieuw/NieuwDesktopGate';

export default function NieuwLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800;900&display=swap"
      />
      <Suspense
        fallback={
          <div style={{ background: '#0d0d11', color: '#a49d90', minHeight: '100vh', padding: 48 }}>
            Laden…
          </div>
        }
      >
        <NieuwDesktopGate>{children}</NieuwDesktopGate>
      </Suspense>
    </>
  );
}
