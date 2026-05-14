'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  clearImpersonationSession,
  getImpersonationAdminEmail,
  getImpersonationAdminToken,
} from '@/lib/impersonation';

/** Zichtbaar wanneer een admin tijdelijk het modellenportaal als model gebruikt. */
export function ImpersonationBanner() {
  const router = useRouter();
  const { user, applySessionToken } = useAuth();
  const [active, setActive] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    setActive(Boolean(getImpersonationAdminToken()));
    setAdminEmail(getImpersonationAdminEmail());
  }, [user?.id]);

  const stop = useCallback(async () => {
    const backup = getImpersonationAdminToken();
    if (!backup) return;
    clearImpersonationSession();
    try {
      await applySessionToken(backup);
    } catch {
      window.alert('Terugkeren naar admin mislukt. Probeer opnieuw in te loggen.');
      return;
    }
    setActive(false);
    router.replace('/admin/modellen-profielen');
  }, [applySessionToken, router]);

  if (!active || !user) return null;

  return (
    <div className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
      <strong>Bureau-modus:</strong> je bent ingelogd als <span className="font-mono">{user.email}</span>
      {adminEmail ? (
        <>
          {' '}
          (admin: <span className="font-mono">{adminEmail}</span>)
        </>
      ) : null}
      .{' '}
      <button
        type="button"
        className="font-semibold text-burgundy underline hover:text-burgundyDeep"
        onClick={() => void stop()}
      >
        Stop en terug naar admin
      </button>
    </div>
  );
}
