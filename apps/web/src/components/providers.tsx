'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/auth-context';
import { LoadingProvider } from '@/context/loading-context';
import { ContentProvider } from '@/context/content-context';
import { I18nProvider } from '@/i18n/context';
import { PushSwRegister } from '@/components/PushSwRegister';
import { PageViewTracker } from '@/components/PageViewTracker';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <LoadingProvider>
        <AuthProvider>
          <PageViewTracker />
          <PushSwRegister />
          <ContentProvider>{children}</ContentProvider>
        </AuthProvider>
      </LoadingProvider>
    </I18nProvider>
  );
}
