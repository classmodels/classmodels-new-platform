'use client';

import { CmText } from '@/components/CmText';

/** Handschrift-achtige tagline zoals op het flyer-ontwerp. */
export function GuestSignatureTagline({
  variant = 'dark',
  className = '',
}: {
  variant?: 'dark' | 'light';
  className?: string;
}) {
  const tone =
    variant === 'light'
      ? 'text-[clamp(1rem,2.4vw,1.35rem)] text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]'
      : 'text-[clamp(1.05rem,2.6vw,1.5rem)] text-[#b8942f]';

  return (
    <CmText
      contentKey="portal.guest.signature"
      as="p"
      className={`italic leading-snug ${tone} ${className}`}
      style={{
        fontFamily:
          "'Segoe Script', 'Snell Roundhand', 'Bradley Hand ITC', 'Apple Chancery', 'Lucida Handwriting', cursive",
      }}
      fallback="Jij bent uniek. Wij zien het."
    />
  );
}
