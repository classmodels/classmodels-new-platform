'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  alt?: string;
  /** Eerste rijen: meteen laden */
  priority?: boolean;
  className?: string;
};

function withRetry(src: string, retry: number): string {
  if (retry <= 0) return src;
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}retry=${retry}`;
}

export function CatalogModelThumb({ src, alt = '', priority = false, className = '' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [active, setActive] = useState(priority);
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setRetry(0);
  }, [src]);

  useEffect(() => {
    if (priority) setActive(true);
  }, [priority]);

  useEffect(() => {
    if (priority || active) return;
    const el = wrapRef.current;
    if (!el) return;
    const activate = () => setActive(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          activate();
          io.disconnect();
        }
      },
      { rootMargin: '400px 0px', threshold: 0.01 },
    );
    io.observe(el);
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    if (rect.height > 0 && rect.bottom >= -400 && rect.top <= vh + 400) {
      activate();
      io.disconnect();
    }
    return () => io.disconnect();
  }, [priority, active]);

  useEffect(() => {
    if (!active) return;
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, [active, src, retry]);

  const markLoaded = () => setLoaded(true);

  return (
    <div ref={wrapRef} className={`relative aspect-[3/4] w-full overflow-hidden bg-zinc-800 ${className || 'rounded-md'}`}>
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-zinc-700/80" aria-hidden />
      ) : null}
      {active && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={withRetry(src, retry)}
          alt={alt}
          className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={markLoaded}
          onError={() => {
            if (retry < 2) setRetry((n) => n + 1);
            else markLoaded();
          }}
        />
      ) : null}
    </div>
  );
}
