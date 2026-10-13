'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { GratisTestshootLanding, type HomeCampaign } from '@/components/GratisTestshootLanding';
import { useAuth } from '@/context/auth-context';
import { getApiBase } from '@/lib/api';

/**
 * Beginpagina toont de gepubliceerde campagne (gsm + desktop),
 * alleen voor bezoekers die niet ingelogd zijn, en niet als iemand
 * al naar een portaal of de agenda gaat (?m= / ?book=).
 */
export function GratisTestshootHomeGate({ children }: { children: ReactNode }) {
  const search = useSearchParams();
  const { user, loading } = useAuth();
  const intoSite = Boolean(search.get('m') || search.get('book'));
  const [campaign, setCampaign] = useState<HomeCampaign | null | 'fallback' | undefined>(undefined);

  useEffect(() => {
    if (intoSite) return;
    const base = getApiBase();
    fetch(`${base}/agenda/home-campaign`)
      .then(async (r) => {
        if (!r.ok) {
          setCampaign('fallback');
          return;
        }
        const data = (await r.json()) as { campaign?: HomeCampaign | null };
        setCampaign(data.campaign ?? null);
      })
      .catch(() => setCampaign('fallback'));
  }, [intoSite]);

  if (intoSite) return <>{children}</>;

  if (loading || campaign === undefined) {
    return <div className="min-h-[100dvh]" style={{ background: '#0a0908' }} aria-hidden />;
  }

  if (user) return <>{children}</>;
  if (campaign === 'fallback') return <GratisTestshootLanding />;
  if (!campaign) return <>{children}</>;

  return <GratisTestshootLanding campaign={campaign} />;
}
