'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/auth-context';
import { ContentProvider } from '@/context/content-context';
import { I18nProvider } from '@/i18n/context';
import { PushSwRegister } from '@/components/PushSwRegister';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <PushSwRegister />
        <ContentProvider>{children}</ContentProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
