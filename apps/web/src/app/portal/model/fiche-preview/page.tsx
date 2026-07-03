'use client';

import Link from 'next/link';
import { ModelGallerySheet } from '@/components/model-portal/ModelGallerySheet';
import { SHOWCASE_MODEL } from '@/components/model-portal/model-gallery-3d/showcaseDemoData';

/** Lokaal voorbeeld van de modellenfiche-popup — geen database nodig. */
export default function FichePreviewPage() {
  return (
    <div className="fixed inset-0 bg-black">
      <Link
        href="/portal/model?tab=modellen"
        className="absolute left-4 top-4 z-[100] rounded-full border border-white/20 bg-black/50 px-3.5 py-1.5 text-xs text-white/90 backdrop-blur-sm transition hover:bg-black/70"
      >
        ← Terug
      </Link>
      <ModelGallerySheet
        m={SHOWCASE_MODEL}
        initialPhotoSrc=""
        isAdmin={false}
        token={null}
        onClose={() => {
          window.location.href = '/portal/model?tab=modellen';
        }}
        onPrint={() => window.print()}
      />
    </div>
  );
}
