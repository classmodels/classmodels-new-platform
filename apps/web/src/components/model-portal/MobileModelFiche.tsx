'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { MobileAppBar } from '@/components/MobileAppBar';
import { CmProgressBar } from '@/components/CmProgressBar';
import {
  showroomDisplayName,
  showroomStats,
} from '@/components/model-portal/model-gallery-3d/showroomTextData';
import { useShowroomGallery } from '@/components/model-portal/model-gallery-3d/useShowroomGallery';

/* Lichte gsm-stijl (zelfde palet als de mobiele beginpagina). */
const BG = '#f1eee8';
const CARD = '#faf8f4';
const LINE = '#ddd5c7';
const TEXT = '#372c1f';
const TEXT_SOFT = '#7a6e5d';
const ACCENT = '#8a6a3b';

function toTitleCase(v: string): string {
  return v
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Klein menu voor de losse modellenpagina's op de gsm. */
export function MobileModelPagesMenu() {
  const rowClass =
    'flex w-full items-center justify-between gap-2 border-b border-line bg-white py-3 pl-3 pr-2 text-left text-[13px] font-medium text-ink hover:bg-panel/70';
  return (
    <nav className="bg-white" aria-label="Model menu">
      <Link href="/portal/model" className={rowClass}>
        <span>Portaal-startpagina</span>
        <span aria-hidden>›</span>
      </Link>
      <Link href="/portal/model?tab=modellen" className={rowClass}>
        <span>Modellen</span>
        <span aria-hidden>›</span>
      </Link>
      <Link href="/portal/model?tab=profiel" className={rowClass}>
        <span>Mijn profiel / modellenfiche</span>
        <span aria-hidden>›</span>
      </Link>
      <Link href="/portal/model?tab=push" className={rowClass}>
        <span>Pushberichten</span>
        <span aria-hidden>›</span>
      </Link>
    </nav>
  );
}

/**
 * Modellenfiche op de gsm: geen 3D-showroom (die is daar onleesbaar klein),
 * maar de gewone foto's en info onder elkaar, in de lichte gsm-stijl.
 */
export function MobileModelFiche({ modelId }: { modelId: string | null }) {
  const { token } = useAuth();
  const gallery = useShowroomGallery(token, modelId);
  const [photoIndex, setPhotoIndex] = useState(0);

  /** De showroom-hook herhaalt foto's tot 8 stuks — hier alleen de unieke tonen. */
  const photos = useMemo(() => [...new Set(gallery.photoUrls)], [gallery.photoUrls]);

  const model = gallery.model;
  const name = model ? toTitleCase(showroomDisplayName(model, false)) : '';
  const stats = model ? showroomStats(model) : [];
  const avail = model?.beschikbaar?.length
    ? model.beschikbaar.map((b) => b.trim()).filter(Boolean)
    : [];

  const hero = photos[Math.min(photoIndex, Math.max(0, photos.length - 1))] ?? '';

  return (
    <div className="min-h-[100dvh]" style={{ background: BG, color: TEXT }}>
      <MobileAppBar
        title="Modellenportaal"
        subtitle="Modellenfiche"
        menuTitle="Menu"
        menuContent={<MobileModelPagesMenu />}
        backRow
      />

      <div className="cm-safe-bottom mx-auto w-full max-w-[560px] px-4 pb-10 pt-4">
        {gallery.loading ? (
          <div className="mx-auto mt-10 w-full max-w-xs">
            <CmProgressBar label="Modellenfiche laden…" />
          </div>
        ) : null}

        {!gallery.loading && gallery.error && !model ? (
          <p className="mt-6 text-center text-sm" style={{ color: TEXT_SOFT }}>
            {gallery.error}
          </p>
        ) : null}

        {!gallery.loading && model ? (
          <>
            {/* Naam + leeftijd */}
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: '#221c15', border: `1px solid #16110b` }}
            >
              <p className="text-lg font-semibold tracking-wide text-[#f6efe2]">{name}</p>
              {model.age != null ? (
                <p className="mt-0.5 text-[13px] text-[#cabfa8]">{model.age} jaar</p>
              ) : null}
            </div>

            {/* Grote foto */}
            {hero ? (
              <div
                className="mt-4 overflow-hidden rounded-xl"
                style={{ border: `1px solid ${LINE}`, background: CARD }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero}
                  alt={name}
                  className="block w-full select-none object-cover"
                  style={{ aspectRatio: '3 / 4', objectPosition: 'center top' }}
                  draggable={false}
                />
              </div>
            ) : null}

            {/* Kleine foto's — tik om de grote foto te wisselen */}
            {photos.length > 1 ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {photos.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setPhotoIndex(i)}
                    className="overflow-hidden rounded-lg outline-none"
                    style={{
                      border: i === photoIndex ? `2px solid ${ACCENT}` : `1px solid ${LINE}`,
                      background: CARD,
                    }}
                    aria-label={`Foto ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      className="block h-full w-full select-none object-cover"
                      style={{ aspectRatio: '2 / 3', objectPosition: 'center top' }}
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            ) : null}

            {/* Maten en info */}
            <div
              className="mt-4 rounded-xl px-4 py-4"
              style={{ background: CARD, border: `1px solid ${LINE}` }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: TEXT_SOFT }}
              >
                Modelinfo
              </p>
              <dl className="mt-2">
                {stats.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0"
                    style={{ borderColor: LINE }}
                  >
                    <dt className="text-[13px]" style={{ color: TEXT_SOFT }}>
                      {label}
                    </dt>
                    <dd className="text-right text-[14px] font-semibold" style={{ color: TEXT }}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Beschikbaar voor */}
            {avail.length ? (
              <div
                className="mt-4 rounded-xl px-4 py-4"
                style={{ background: CARD, border: `1px solid ${LINE}` }}
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: TEXT_SOFT }}
                >
                  Beschikbaar voor
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {avail.map((b) => (
                    <span
                      key={b}
                      className="rounded-full px-3 py-1 text-[12px] font-semibold"
                      style={{ background: '#efe7d6', color: '#5c4a2e', border: '1px solid #dfd3ba' }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
