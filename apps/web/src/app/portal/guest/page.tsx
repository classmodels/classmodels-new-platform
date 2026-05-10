import { Suspense } from 'react';
import { GuestPortalLayout } from '@/components/guest-portal/GuestPortalLayout';

/** Publiek gastenportaal (geen login vereist). */
export default function GuestPortalPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-page px-4 py-16 text-center text-sm text-muted">Laden…</div>}>
      <GuestPortalLayout />
    </Suspense>
  );
}
