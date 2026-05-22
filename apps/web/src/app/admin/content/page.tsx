'use client';

import { Suspense } from 'react';
import { ContentTextsEditor } from '@/components/admin/ContentTextsEditor';

export default function AdminContentPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted">Laden…</p>}>
      <ContentTextsEditor />
    </Suspense>
  );
}
