'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  ModelsCatalogGrid,
  type CatalogToolbarState,
} from '@/components/models-catalog/ModelsCatalogGrid';
import { ModelGalleryNeonSidebar } from '@/components/model-portal/ModelGalleryNeonSidebar';
import { GalleryBackWall, GalleryWallMount } from '@/components/model-portal/GalleryCanvasFrame';
import { ImpersonationBanner } from '@/components/model-portal/ImpersonationBanner';
import { MobileAppBar } from '@/components/MobileAppBar';

export function ModelPortalModellenGallery() {
  const [toolbar, setToolbar] = useState<CatalogToolbarState | null>(null);

  const onToolbarState = useCallback((state: CatalogToolbarState) => {
    setToolbar(state);
  }, []);

  const mobileMenu = <ModelGalleryNeonSidebar state={toolbar} />;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-black text-white">
      <MobileAppBar title="Modellenportaal" subtitle="Modellen" menuTitle="Filters" menuContent={mobileMenu} />
      <ImpersonationBanner />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/model-gallery-bg.jpg"
        alt=""
        className="absolute inset-0 h-full w-full select-none object-cover"
        draggable={false}
      />

      <div className="absolute inset-0 [perspective:1800px]">
        <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
          {/* Linkermuur — smaller, naast de plant, in muurperspectief */}
          <aside
            className="absolute bottom-[14vh] left-[13.5vw] top-[17vh] hidden w-[10.5vw] lg:block"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <GalleryWallMount className="h-full w-full">
              <div className="h-full w-full overflow-y-auto [scrollbar-color:rgba(255,180,120,0.25)_transparent] [scrollbar-width:thin]">
                <ModelGalleryNeonSidebar state={toolbar} />
              </div>
            </GalleryWallMount>
          </aside>

          {/* Achterwand — galerij */}
          <main className="absolute bottom-[9vh] left-[25.5vw] right-[3.5vw] top-[11vh] flex min-w-0 flex-col overflow-hidden">
            <GalleryBackWall className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 text-center" style={{ transform: 'translateZ(18px)' }}>
                <h1 className="font-sans text-[1.75vw] font-light uppercase tracking-[0.28em] text-white drop-shadow-[0_0_16px_rgba(255,200,150,0.35)]">
                  Model Gallery
                </h1>
              </div>
              <div
                className="mt-[1.5vw] min-h-0 flex-1 overflow-y-auto pr-[0.4vw] [scrollbar-color:rgba(255,180,120,0.25)_transparent] [scrollbar-width:thin]"
                style={{ transform: 'translateZ(12px)' }}
              >
                <ModelsCatalogGrid
                  layout="gallery-wall"
                  toolbarPlacement="external"
                  onToolbarState={onToolbarState}
                />
              </div>
            </GalleryBackWall>
          </main>
        </div>
      </div>

      <Link
        href="/portal/model?tab=home"
        className="absolute left-[1.2vw] top-[1.2vw] z-50 rounded-full border border-white/20 bg-black/45 px-[0.9vw] py-[0.35vw] text-[0.78vw] text-white/85 backdrop-blur-sm transition hover:bg-black/65 hover:text-white"
      >
        ← Terug
      </Link>
    </div>
  );
}
