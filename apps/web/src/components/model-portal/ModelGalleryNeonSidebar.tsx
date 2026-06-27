'use client';

import type { ReactNode } from 'react';
import type { CatalogToolbarState } from '@/components/models-catalog/ModelsCatalogGrid';

function MenuIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1.05vw] w-[1.05vw] shrink-0 stroke-white/92"
      fill="none"
      strokeWidth="1.35"
      aria-hidden
    >
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  filter: 'M4 6h16M7 12h10M10 18h4',
  alle: 'M4 5h16v14H4z M8 9h8M8 13h5',
  favoriet:
    'M12 20.5l-1.2-1.1C6.5 15.4 4 13.1 4 10.2 4 7.8 5.8 6 8.2 6c1.4 0 2.7.7 3.8 1.8C13.1 6.7 14.4 6 15.8 6 18.2 6 20 7.8 20 10.2c0 2.9-2.5 5.2-6.8 9.2L12 20.5z',
  newface: 'M12 12a4 4 0 100-8 4 4 0 000 8z M6 20v-1a6 6 0 0112 0v1',
  tryout: 'M4 7h16M4 12h16M4 17h10',
  inactief: 'M6 6l12 12M18 6L6 18',
  vestiging: 'M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z M9 12l2 2 4-4',
};

function Standoff({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute z-10 h-[0.38vw] w-[0.38vw] rounded-full bg-gradient-to-br from-zinc-100 via-zinc-400 to-zinc-700 shadow-[0_0.04vw_0.1vw_rgba(0,0,0,0.65)] ${className}`}
      aria-hidden
    />
  );
}

function GlassMenuPanel({
  active,
  onClick,
  icon,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon: keyof typeof ICONS;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-[3.35vw] w-full overflow-hidden backdrop-blur-[10px] transition duration-200 ${
        active
          ? 'border-amber-300/80 bg-white/[0.09] shadow-[0_0_22px_rgba(255,120,50,0.38),0_0.4vw_0.85vw_rgba(0,0,0,0.48),inset_0_0_20px_rgba(255,90,40,0.07)]'
          : 'border-amber-200/45 bg-white/[0.035] shadow-[0_0_14px_rgba(255,110,55,0.2),0_0.3vw_0.65vw_rgba(0,0,0,0.42)] hover:border-amber-200/65 hover:bg-white/[0.055]'
      } border`}
      style={{ transform: 'translateZ(8px)' }}
    >
      <Standoff className="left-[0.32vw] top-[0.32vw]" />
      <Standoff className="right-[0.32vw] top-[0.32vw]" />
      <Standoff className="bottom-[0.32vw] left-[0.32vw]" />
      <Standoff className="bottom-[0.32vw] right-[0.32vw]" />
      <div className="flex min-h-[3.35vw] items-center gap-[0.65vw] px-[0.85vw] py-[0.7vw]">
        <MenuIcon d={ICONS[icon]} />
        <span className="h-[1.35vw] w-px shrink-0 bg-white/25" aria-hidden />
        <span
          className={`min-w-0 flex-1 font-sans text-[0.58vw] font-medium uppercase leading-snug tracking-[0.11em] ${
            active ? 'text-white' : 'text-white/90 group-hover:text-white'
          }`}
        >
          {children}
        </span>
      </div>
    </button>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-[1.05vw]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[3.35vw] animate-pulse border border-amber-200/20 bg-white/[0.03] backdrop-blur-sm"
        />
      ))}
    </div>
  );
}

export function ModelGalleryNeonSidebar({ state }: { state: CatalogToolbarState | null }) {
  if (!state) return <SidebarSkeleton />;

  const {
    tab,
    setTab,
    filtersOpen,
    setFiltersOpen,
    isAdmin,
    tabCounts,
    vestigingen,
    vestigingSel,
    toggleVestiging,
  } = state;

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
    <nav className="flex flex-col [transform-style:preserve-3d]" aria-label="Modellen filters">
      {vestigingen.length ? (
        <div className="mb-[1.35vw]">
          <p className="mb-[0.75vw] pl-[0.15vw] font-sans text-[0.48vw] font-semibold uppercase tracking-[0.2em] text-amber-200/75">
            Vestigingen
          </p>
          <div className="flex flex-col gap-[1.05vw]">
            {vestigingen.map((v) => (
              <GlassMenuPanel
                key={v.slug}
                active={vestigingSel.has(v.slug)}
                onClick={() => toggleVestiging(v.slug)}
                icon="vestiging"
              >
                {v.label} ({v.count})
              </GlassMenuPanel>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mb-[0.75vw] pl-[0.15vw] font-sans text-[0.48vw] font-semibold uppercase tracking-[0.2em] text-amber-200/75">
        Modellen
      </p>
      <div className="flex flex-col gap-[1.05vw]">
        <GlassMenuPanel
          active={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
          icon="filter"
        >
          {filtersOpen ? 'Filter sluiten' : 'Filter modellen'}
        </GlassMenuPanel>
        {tabs.map((t) => (
          <GlassMenuPanel
            key={t.id}
            active={tab === t.id && !filtersOpen}
            onClick={() => setTab(t.id)}
            icon={t.icon}
          >
            {t.label} ({t.count})
          </GlassMenuPanel>
        ))}
      </div>
    </nav>
  );
}
