'use client';

import { useEffect, useState } from 'react';
import { formatPromoCountdown, premiumPromoDeadlineMs } from '@/lib/premium-promo';

export function PremiumPromoCountdown({ className = '' }: { className?: string }) {
  const [endsAt] = useState(() => premiumPromoDeadlineMs());
  const [left, setLeft] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft(Math.max(0, endsAt - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (left <= 0) return null;

  return (
    <p className={`text-[10px] font-medium tabular-nums tracking-wide text-white/75 ${className}`}>
      Aanbieding eindigt over {formatPromoCountdown(left)} (zaterdag 12:00)
    </p>
  );
}
