'use client';

const GOLD = '#c5a07d';

/** Kleine muurfoto — zwart kader, hangt op schuine muur. */
export function GalleryWallPhoto({
  src,
  active,
  onClick,
  borderPx = 3,
}: {
  src: string;
  active?: boolean;
  onClick?: () => void;
  borderPx?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-0 min-w-0 overflow-hidden bg-black p-0 outline-none transition ${active ? 'brightness-110 ring-1 ring-[#e8b88a]/80' : 'hover:brightness-105'}`}
      style={{
        border: `${borderPx}px solid #0a0a0a`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.06)',
        aspectRatio: '2 / 3',
      }}
      aria-label="Galerijfoto"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="block h-full w-full object-cover object-top"
        draggable={false}
      />
    </button>
  );
}

/** Hoofdfoto — gouden rand, licht 3D tegen achterwand. */
export function GalleryHeroPhoto({
  src,
  borderPx = 3,
}: {
  src: string;
  borderPx?: number;
}) {
  return (
    <div
      className="w-full overflow-hidden bg-[#1a1410]"
      style={{
        border: `${borderPx}px solid ${GOLD}`,
        boxShadow:
          'inset 0 0 0 1px rgba(0,0,0,0.45), 0 0 0 1px rgba(198,160,125,0.35), 0 12px 40px rgba(0,0,0,0.55)',
        aspectRatio: '2 / 3',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="block h-full w-full object-cover object-[center_10%]"
        draggable={false}
      />
    </div>
  );
}
