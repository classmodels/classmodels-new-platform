'use client';

import { useEffect, useState } from 'react';
import { getApiBase } from '@/lib/api';
import partnersJson from '@/data/partners.json';

export type PartnerLogoItem = {
  id?: string;
  name: string;
  websiteUrl?: string | null;
  imagePath: string;
  sortOrder?: number;
};

/** Alle logo's uit Desktop/logo's 1 (behalve flyers/advertenties). */
export const STATIC_PARTNER_LOGOS: PartnerLogoItem[] = partnersJson as PartnerLogoItem[];

function resolveImageSrc(imagePath: string): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  if (imagePath.startsWith('/partners/')) return imagePath;
  if (imagePath.startsWith('/uploads/')) {
    const base = getApiBase().replace(/\/$/, '');
    return `${base}${imagePath}`;
  }
  return imagePath;
}

/**
 * Partnerstrook: zwarte achtergrond, 5px gouden kader, alle logo's.
 * Links openen in een nieuw tabblad.
 */
export function PartnersStrip({
  title = 'Wij hebben al samengewerkt met:',
}: {
  title?: string;
}) {
  const [items, setItems] = useState<PartnerLogoItem[]>(STATIC_PARTNER_LOGOS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let staticItems = STATIC_PARTNER_LOGOS;
      try {
        const res = await fetch('/partners/partners.json', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as PartnerLogoItem[];
          if (Array.isArray(data) && data.length > 0) staticItems = data;
        }
      } catch {
        /* keep embedded */
      }
      try {
        const base = getApiBase().replace(/\/$/, '');
        const res = await fetch(`${base}/partners`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as PartnerLogoItem[];
          // Alleen API gebruiken als die minstens evenveel logo's heeft (admin-set).
          if (!cancelled && Array.isArray(data) && data.length >= staticItems.length) {
            setItems(data);
            return;
          }
        }
      } catch {
        /* fallback static */
      }
      if (!cancelled) setItems(staticItems);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="cm-partners" aria-label={title}>
      <div className="nieuw-wrap">
        <p className="cm-partners-title">{title}</p>
        <ul className="cm-partners-grid">
          {items.map((p, i) => {
            const src = resolveImageSrc(p.imagePath);
            const inner = (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={p.name} loading="lazy" decoding="async" width={200} height={120} />
            );
            const key = p.id || `${p.name}-${i}`;
            return (
              <li key={key} className="cm-partners-cell">
                {p.websiteUrl ? (
                  <a
                    href={p.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={p.name}
                    aria-label={`${p.name} (opent in nieuw tabblad)`}
                  >
                    {inner}
                  </a>
                ) : (
                  <span title={p.name}>{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
