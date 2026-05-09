'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/auth-context';
import { ContentProvider } from '@/context/content-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ContentProvider>{children}</ContentProvider>
    </AuthProvider>
  );
}
