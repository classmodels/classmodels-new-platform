import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { AppChrome } from '@/components/app-chrome';

const base = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

export const metadata: Metadata = {
  title: 'Class-Models',
  description: 'Class Models — modellenplatform',
  manifest: `${base}/manifest.json`,
  appleWebApp: { capable: true, title: 'Class-Models' },
};

export const viewport: Viewport = {
  themeColor: '#6f121b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen font-sans">
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
