'use client';

import type { ReactNode } from 'react';
import type { CatalogToolbarState } from '@/components/models-catalog/ModelsCatalogGrid';

function MenuIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-white/90" fill="none" strokeWidth="1.4" aria-hidden>
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
      className={`pointer-events-none absolute z-10 h-2 w-2 rounded-full bg-gradient-to-br from-zinc-100 via-zinc-400 to-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${className}`}
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
      className={`group relative w-full overflow-hidden border backdrop-blur-md transition duration-200 ${
        active
          ? 'border-[#ff9a5c]/80 bg-white/[0.1] shadow-[0_0_20px_rgba(255,120,60,0.35),0_4px_12px_rgba(0,0,0,0.45),inset_0_0_18px_rgba(255,90,40,0.06)]'
          : 'border-[#ff9a5c]/35 bg-white/[0.04] shadow-[0_0_10px_rgba(255,110,55,0.15),0_3px_10px_rgba(0,0,0,0.35)] hover:border-[#ff9a5c]/55 hover:bg-white/[0.07]'
      }`}
    >
      <Standoff className="left-2 top-2" />
      <Standoff className="right-2 top-2" />
      <Standoff className="bottom-2 left-2" />
      <Standoff className="bottom-2 right-2" />
      <div className="flex min-h-[52px] items-center gap-3 px-3.5 py-3">
        <MenuIcon d={ICONS[icon]} />
        <span className="h-5 w-px shrink-0 bg-white/20" aria-hidden />
        <span
          className={`min-w-0 flex-1 text-left text-[10px] font-medium uppercase leading-snug tracking-[0.14em] md:text-[11px] ${
            active ? 'text-white' : 'text-white/88 group-hover:text-white'
          }`}
        >
          {children}
        </span>
      </div>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ffb380]/80">{children}</p>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[52px] animate-pulse border border-[#ff9a5c]/20 bg-white/[0.03]" />
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
    <nav className="flex flex-col" aria-label="Modellen filters">
      <SectionLabel>Vestigingen</SectionLabel>
      <div className="mb-6 flex flex-col gap-4">
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

      <SectionLabel>Modellen</SectionLabel>
      <div className="flex flex-col gap-4">
        <GlassMenuPanel active={filtersOpen} onClick={() => setFiltersOpen((v) => !v)} icon="filter">
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
