'use client';

import { useEffect, useState } from 'react';
import { formatPromoCountdown, premiumPromoDeadlineMs } from '@/lib/premium-promo';

export function PremiumPromoCountdown({
  className = '',
  size = 'sm',
}: {
  className?: string;
  /** `md` = iets groter, bv. rechts uitgelijnd op premium-banner */
  size?: 'sm' | 'md';
}) {
  const [endsAt] = useState(() => premiumPromoDeadlineMs());
  const [left, setLeft] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft(Math.max(0, endsAt - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (left <= 0) return null;

  const textClass = size === 'md' ? 'text-sm' : 'text-[10px]';

  return (
    <p className={`${textClass} font-medium tabular-nums tracking-wide text-white/80 ${className}`}>
      Aanbieding eindigt over {formatPromoCountdown(left)} (zaterdag 12:00)
    </p>
  );
}
