'use client';

import type { ReactNode } from 'react';
import type { CatalogToolbarState } from '@/components/models-catalog/ModelsCatalogGrid';

function MenuIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95vw] w-[0.95vw] shrink-0 stroke-white/90" fill="none" strokeWidth="1.4">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  filter:
    'M4 6h16M7 12h10M10 18h4',
  alle:
    'M4 5h16v14H4z M8 9h8M8 13h5',
  favoriet:
    'M12 20.5l-1.2-1.1C6.5 15.4 4 13.1 4 10.2 4 7.8 5.8 6 8.2 6c1.4 0 2.7.7 3.8 1.8C13.1 6.7 14.4 6 15.8 6 18.2 6 20 7.8 20 10.2c0 2.9-2.5 5.2-6.8 9.2L12 20.5z',
  newface:
    'M12 12a4 4 0 100-8 4 4 0 000 8z M6 20v-1a6 6 0 0112 0v1',
  tryout:
    'M4 7h16M4 12h16M4 17h10',
  inactief:
    'M6 6l12 12M18 6L6 18',
};

function Standoff({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute h-[0.42vw] w-[0.42vw] rounded-full bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-600 shadow-[0_0.05vw_0.12vw_rgba(0,0,0,0.6)] ${className}`}
      aria-hidden
    />
  );
}

function GlassMenuPanel({
  active,
  onClick,
  icon,
  depth = 0,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon: keyof typeof ICONS;
  depth?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden backdrop-blur-[8px] transition duration-200 ${
        active
          ? 'border-amber-300/75 bg-white/[0.08] shadow-[0_0_20px_rgba(255,130,70,0.4),0_0.35vw_0.7vw_rgba(0,0,0,0.45),inset_0_0_16px_rgba(255,100,50,0.08)]'
          : 'border-amber-200/40 bg-white/[0.04] shadow-[0_0_12px_rgba(255,120,60,0.22),0_0.25vw_0.55vw_rgba(0,0,0,0.4)] hover:border-amber-200/60 hover:bg-white/[0.06]'
      } border`}
      style={{ transform: `translateZ(${4 + depth * 2}px)` }}
    >
      <Standoff className="left-[0.28vw] top-[0.28vw]" />
      <Standoff className="right-[0.28vw] top-[0.28vw]" />
      <Standoff className="bottom-[0.28vw] left-[0.28vw]" />
      <Standoff className="bottom-[0.28vw] right-[0.28vw]" />
      <div className="flex items-center gap-[0.55vw] px-[0.75vw] py-[0.58vw]">
        <MenuIcon d={ICONS[icon]} />
        <span
          className={`min-w-0 flex-1 font-sans text-[0.54vw] font-medium uppercase leading-tight tracking-[0.1em] ${
            active ? 'text-white' : 'text-white/88 group-hover:text-white'
          }`}
        >
          {children}
        </span>
      </div>
    </button>
  );
}

export function ModelGalleryNeonSidebar({ state }: { state: CatalogToolbarState | null }) {
  if (!state) {
    return (
      <div className="flex flex-col gap-[0.65vw]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[2.8vw] animate-pulse border border-amber-200/20 bg-white/[0.03] backdrop-blur-sm"
          />
        ))}
      </div>
    );
  }

  const { tab, setTab, filtersOpen, setFiltersOpen, isAdmin, tabCounts } = state;

  const tabs: { id: typeof tab; label: string; count: number; icon: keyof typeof ICONS }[] = [
    { id: 'alle', label: 'Alle', count: tabCounts.alle, icon: 'alle' },
    ...(isAdmin
      ? [{ id: 'favoriet' as const, label: 'Favorieten', count: tabCounts.favoriet, icon: 'favoriet' as const }]
      : []),
    { id: 'newface', label: 'Newface', count: tabCounts.newface, icon: 'newface' },
    ...(isAdmin
      ? [
          { id: 'tryout' as const, label: 'Try-out', count: tabCounts.tryout, icon: 'tryout' as const },
          { id: 'inactief' as const, label: 'Inactief', count: tabCounts.inactief, icon: 'inactief' as const },
        ]
      : []),
  ];

  return (
    <nav className="flex flex-col gap-[0.5vw] [transform-style:preserve-3d]" aria-label="Modellen filters">
      <GlassMenuPanel active={filtersOpen} onClick={() => setFiltersOpen((v) => !v)} icon="filter" depth={0}>
        {filtersOpen ? 'Filter sluiten' : 'Filter modellen'}
      </GlassMenuPanel>
      {tabs.map((t, i) => (
        <GlassMenuPanel
          key={t.id}
          active={tab === t.id && !filtersOpen}
          onClick={() => setTab(t.id)}
          icon={t.icon}
          depth={i + 1}
        >
          {t.label} ({t.count})
        </GlassMenuPanel>
      ))}
    </nav>
  );
}
