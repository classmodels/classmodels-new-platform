'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  ModelsCatalogGrid,
  type CatalogToolbarState,
} from '@/components/models-catalog/ModelsCatalogGrid';
import { ModelGalleryNeonSidebar } from '@/components/model-portal/ModelGalleryNeonSidebar';
import { ImpersonationBanner } from '@/components/model-portal/ImpersonationBanner';
import { MobileAppBar } from '@/components/MobileAppBar';

/** Donkerbruine galerijruimte — geen foto-achtergrond, pure CSS. */
export function ModelPortalModellenGallery() {
  const [toolbar, setToolbar] = useState<CatalogToolbarState | null>(null);

  const onToolbarState = useCallback((state: CatalogToolbarState) => {
    setToolbar(state);
  }, []);

  const mobileMenu = <ModelGalleryNeonSidebar state={toolbar} />;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#0e0806] text-white">
      <MobileAppBar title="Modellenportaal" subtitle="Modellen" menuTitle="Filters" menuContent={mobileMenu} />
      <ImpersonationBanner />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Vloer-reflectie */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-[#080504] via-[#1a0e0a]/90 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-[8%] bottom-[20%] h-px bg-gradient-to-r from-transparent via-[#ff7040]/70 to-transparent shadow-[0_0_18px_rgba(255,100,50,0.55)]"
          aria-hidden
        />

        {/* 3D-hoek: linkermuur verder weg, achterwand frontaal */}
        <div className="relative flex h-full [perspective:1200px]">
          {/* Linkermuur — verdwijnt in de diepte */}
          <div className="relative hidden w-[min(30%,340px)] shrink-0 lg:block">
            <div
              className="absolute bottom-[6%] left-[6%] right-0 top-[6%] overflow-hidden rounded-sm bg-gradient-to-br from-[#2e1a16] via-[#221410] to-[#140a08] shadow-[inset_-12px_0_32px_rgba(0,0,0,0.55)]"
              style={{
                transform: 'rotateY(34deg)',
                transformOrigin: 'right center',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Neon-rand langs de hoek */}
              <div
                className="pointer-events-none absolute inset-y-[8%] right-0 w-[2px] bg-gradient-to-b from-[#ff8c42]/30 via-[#ff6030] to-[#ff8c42]/30 shadow-[0_0_14px_rgba(255,96,48,0.75)]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[#ff6030]/50 shadow-[0_0_10px_rgba(255,96,48,0.5)]"
                aria-hidden
              />
              <div className="h-full overflow-y-auto px-4 py-8 [scrollbar-color:rgba(255,150,100,0.3)_transparent] [scrollbar-width:thin]">
                <ModelGalleryNeonSidebar state={toolbar} />
              </div>
            </div>
          </div>

          {/* Hoeklijn (vloer ↔ muren) */}
          <div
            className="pointer-events-none absolute bottom-[6%] left-[min(30%,340px)] top-[6%] hidden w-px bg-gradient-to-b from-[#ff7040]/20 via-[#ff7040]/50 to-[#ff7040]/20 lg:block"
            aria-hidden
          />

          {/* Achterwand — frontaal, foto&apos;s hangen hier */}
          <div className="relative flex min-w-0 flex-1 flex-col bg-gradient-to-b from-[#2a1814] via-[#1f1210] to-[#160c09]">
            {/* Spotlights van boven */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#ff9040]/12 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-[12%] right-[12%] top-0 h-24 bg-[radial-gradient(ellipse_at_top,rgba(255,180,120,0.14),transparent_70%)]"
              aria-hidden
            />
            {/* Onderste neon-strip */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[#ff7040]/55 shadow-[0_0_14px_rgba(255,100,50,0.45)]"
              aria-hidden
            />

            <header className="relative shrink-0 px-4 pb-2 pt-7 text-center md:pt-9">
              <h1
                className="font-sans text-2xl font-light uppercase tracking-[0.32em] text-white md:text-3xl lg:text-[2rem]"
                style={{ textShadow: '0 0 28px rgba(255,180,120,0.35)' }}
              >
                Model Gallery
              </h1>
            </header>

            <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-8 md:px-8 lg:px-10 [scrollbar-color:rgba(255,150,100,0.25)_transparent] [scrollbar-width:thin]">
              <ModelsCatalogGrid
                layout="gallery-wall"
                toolbarPlacement="external"
                onToolbarState={onToolbarState}
              />
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/portal/model?tab=home"
        className="absolute left-4 top-4 z-50 rounded-full border border-white/20 bg-black/50 px-3.5 py-1.5 text-xs text-white/90 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
      >
        ← Terug
      </Link>
    </div>
  );
}
