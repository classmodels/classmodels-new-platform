import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { AppChrome } from '@/components/app-chrome';

const base = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

export const metadata: Metadata = {
  title: 'Class-Models',
  description: 'Class Models — modellenplatform',
  manifest: `${base}/manifest.json`,
  applicationName: 'Class-Models',
  appleWebApp: {
    capable: true,
    title: 'Class-Models',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: `${base}/icons/favicon-32.png`, sizes: '32x32', type: 'image/png' },
      { url: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: `${base}/icons/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#131314',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
