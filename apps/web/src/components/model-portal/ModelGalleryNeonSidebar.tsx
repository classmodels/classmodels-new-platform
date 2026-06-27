'use client';

import type { ReactNode } from 'react';
import type { CatalogToolbarState } from '@/components/models-catalog/ModelsCatalogGrid';

function NeonMenuButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-[0.35vw] border px-[1.1vw] py-[0.85vw] text-left transition ${
        active
          ? 'border-amber-300/80 bg-black/45 shadow-[0_0_18px_rgba(255,150,90,0.45),inset_0_0_24px_rgba(255,120,60,0.12)]'
          : 'border-amber-200/35 bg-black/30 shadow-[0_0_10px_rgba(255,130,70,0.2)] hover:border-amber-200/55 hover:bg-black/40'
      }`}
    >
      <span
        className={`block font-sans text-[0.72vw] font-semibold uppercase tracking-[0.14em] ${
          active ? 'text-white' : 'text-white/88 group-hover:text-white'
        }`}
      >
        {children}
      </span>
    </button>
  );
}

export function ModelGalleryNeonSidebar({ state }: { state: CatalogToolbarState | null }) {
  if (!state) {
    return (
      <div className="flex flex-col gap-[0.55vw] px-[0.4vw] py-[0.6vw]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[2.6vw] animate-pulse rounded-[0.35vw] border border-amber-200/20 bg-black/25"
          />
        ))}
      </div>
    );
  }

  const { tab, setTab, filtersOpen, setFiltersOpen, isAdmin, tabCounts } = state;

  const tabs: { id: typeof tab; label: string; count: number }[] = [
    { id: 'alle', label: 'Alle', count: tabCounts.alle },
    ...(isAdmin ? [{ id: 'favoriet' as const, label: 'Favorieten', count: tabCounts.favoriet }] : []),
    { id: 'newface', label: 'Newface', count: tabCounts.newface },
    ...(isAdmin
      ? [
          { id: 'tryout' as const, label: 'Try-out', count: tabCounts.tryout },
          { id: 'inactief' as const, label: 'Inactief', count: tabCounts.inactief },
        ]
      : []),
  ];

  return (
    <nav className="flex flex-col gap-[0.55vw] px-[0.4vw] py-[0.6vw]" aria-label="Modellen filters">
      <NeonMenuButton active={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
        {filtersOpen ? 'Filter sluiten' : 'Filter modellen'}
      </NeonMenuButton>
      {tabs.map((t) => (
        <NeonMenuButton key={t.id} active={tab === t.id && !filtersOpen} onClick={() => setTab(t.id)}>
          {t.label} ({t.count})
        </NeonMenuButton>
      ))}
    </nav>
  );
}
