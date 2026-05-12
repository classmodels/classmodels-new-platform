'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/auth-context';
import { ContentProvider } from '@/context/content-context';
import { PushSwRegister } from '@/components/PushSwRegister';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PushSwRegister />
      <ContentProvider>{children}</ContentProvider>
    </AuthProvider>
  );
}
