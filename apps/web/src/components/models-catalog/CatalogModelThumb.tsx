'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  alt?: string;
  /** Eerste rijen: meteen laden */
  priority?: boolean;
};

export function CatalogModelThumb({ src, alt = '', priority = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(priority);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (priority || active) return;
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          io.disconnect();
        }
      },
      { rootMargin: '240px 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority, active]);

  return (
    <div ref={wrapRef} className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-zinc-800">
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-zinc-700/80" aria-hidden />
      ) : null}
      {active && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
        />
      ) : null}
    </div>
  );
}
