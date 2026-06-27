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

export function ModelPortalModellenGallery() {
  const [toolbar, setToolbar] = useState<CatalogToolbarState | null>(null);

  const onToolbarState = useCallback((state: CatalogToolbarState) => {
    setToolbar(state);
  }, []);

  const mobileMenu = (
    <ModelGalleryNeonSidebar state={toolbar} />
  );

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-black text-white">
      <MobileAppBar title="Modellenportaal" subtitle="Modellen" menuTitle="Filters" menuContent={mobileMenu} />
      <ImpersonationBanner />

      <div className="relative flex min-h-[100dvh] w-full items-center justify-center">
        <div className="relative aspect-[16/9] w-full max-h-[100dvh] max-w-[100vw]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/model-gallery-bg.jpg"
            alt=""
            className="absolute inset-0 h-full w-full select-none object-cover"
            draggable={false}
          />

          <div className="absolute inset-0 grid grid-cols-[22%_minmax(0,1fr)]">
            {/* Linkermenu: neon panelen (filters uit de rode balk). */}
            <aside className="hidden min-h-0 flex-col justify-center lg:flex">
              <div className="max-h-[78%] overflow-y-auto px-[1.2vw] py-[2vw] [scrollbar-color:rgba(255,180,120,0.25)_transparent] [scrollbar-width:thin]">
                <ModelGalleryNeonSidebar state={toolbar} />
              </div>
            </aside>

            {/* Galerijmuur: scrollbaar raster met modellen. */}
            <main className="flex min-h-0 min-w-0 flex-col overflow-hidden px-[2vw] pb-[1.4vw] pt-[2.2vw]">
              <div className="shrink-0 text-center">
                <h1 className="font-serif text-[2.1vw] font-semibold uppercase tracking-[0.22em] text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">
                  Model Gallery
                </h1>
              </div>
              <div className="mt-[1.4vw] min-h-0 flex-1 overflow-y-auto pr-[0.4vw] [scrollbar-color:rgba(255,180,120,0.25)_transparent] [scrollbar-width:thin]">
                <ModelsCatalogGrid
                  layout="gallery-wall"
                  toolbarPlacement="external"
                  onToolbarState={onToolbarState}
                />
              </div>
            </main>
          </div>

          <Link
            href="/portal/model?tab=home"
            className="absolute left-[1.2vw] top-[1.2vw] rounded-full border border-white/20 bg-black/45 px-[0.9vw] py-[0.35vw] text-[0.78vw] text-white/85 backdrop-blur-sm transition hover:bg-black/65 hover:text-white"
          >
            ← Terug
          </Link>
        </div>
      </div>
    </div>
  );
}
