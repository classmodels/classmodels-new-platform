'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/auth-context';
import { ContentProvider } from '@/context/content-context';
import { I18nProvider } from '@/i18n/context';
import { PushSwRegister } from '@/components/PushSwRegister';
import { PageViewTracker } from '@/components/PageViewTracker';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <PageViewTracker />
        <PushSwRegister />
        <ContentProvider>{children}</ContentProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
