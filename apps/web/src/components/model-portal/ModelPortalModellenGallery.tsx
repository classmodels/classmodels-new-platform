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

  const mobileMenu = <ModelGalleryNeonSidebar state={toolbar} />;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-black text-white">
      <MobileAppBar title="Modellenportaal" subtitle="Modellen" menuTitle="Filters" menuContent={mobileMenu} />
      <ImpersonationBanner />

      {/* Volledige schermbreedte — achtergrond vult 100vw × 100vh */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/model-gallery-bg.jpg"
        alt=""
        className="absolute inset-0 h-full w-full select-none object-cover"
        draggable={false}
      />

      {/* 3D-scène: linkermuur + achterwand in perspectief */}
      <div className="absolute inset-0 [perspective:1600px]">
        <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
          {/* Linkermuur — menu in perspectief */}
          <aside
            className="absolute bottom-[8vh] left-[2.5vw] top-[14vh] hidden w-[22vw] lg:block"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              className="h-full w-full overflow-y-auto pr-[0.6vw] [scrollbar-color:rgba(255,180,120,0.25)_transparent] [scrollbar-width:thin]"
              style={{
                transform: 'rotateY(18deg) rotateX(1.5deg)',
                transformOrigin: 'right center',
              }}
            >
              <ModelGalleryNeonSidebar state={toolbar} />
            </div>
          </aside>

          {/* Achterwand — galerij met subtiel perspectief */}
          <main
            className="absolute bottom-[7vh] left-[24vw] right-[3vw] top-[10vh] flex min-w-0 flex-col overflow-hidden"
            style={{
              transform: 'rotateY(-2.5deg) rotateX(0.5deg)',
              transformOrigin: 'left center',
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="shrink-0 text-center" style={{ transform: 'translateZ(20px)' }}>
              <h1 className="font-sans text-[1.85vw] font-light uppercase tracking-[0.28em] text-white drop-shadow-[0_0_16px_rgba(255,200,150,0.35)]">
                Model Gallery
              </h1>
            </div>
            <div
              className="mt-[1.6vw] min-h-0 flex-1 overflow-y-auto pr-[0.5vw] [scrollbar-color:rgba(255,180,120,0.25)_transparent] [scrollbar-width:thin]"
              style={{ transform: 'translateZ(14px)' }}
            >
              <ModelsCatalogGrid
                layout="gallery-wall"
                toolbarPlacement="external"
                onToolbarState={onToolbarState}
              />
            </div>
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
