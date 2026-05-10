'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BeginLanding } from '@/components/BeginLanding';
import { useAuth } from '@/context/auth-context';

/** `/` — donkere enterpagina; ingelogde model/klant meteen naar hun portaal. */
export function BeginEnterRoute() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (!user.roles.includes('model') && !user.roles.includes('client')) return;
    if (user.defaultPortal === 'model' && user.roles.includes('model')) {
      router.replace('/portal/model');
    }
    if (user.defaultPortal === 'client' && user.roles.includes('client')) {
      router.replace('/portal/client');
    }
  }, [user, loading, router]);

  return <BeginLanding />;
}
