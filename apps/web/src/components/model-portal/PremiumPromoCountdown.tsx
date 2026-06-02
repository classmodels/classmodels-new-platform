'use client';

export function PremiumPromoCountdown({
  className = '',
  size = 'sm',
}: {
  className?: string;
  /** `md` = iets groter, bv. rechts uitgelijnd op premium-banner */
  size?: 'sm' | 'md';
}) {
  const textClass = size === 'md' ? 'text-sm' : 'text-[10px]';

  return (
    <p className={`${textClass} font-semibold uppercase tracking-wide text-amber-200 ${className}`}>
      Alleen vandaag voordeelprijs
    </p>
  );
}
