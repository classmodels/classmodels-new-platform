'use client';

import { useState } from 'react';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';

export function NieuwBookingBlock({
  slug,
  title,
  subtitle,
}: {
  slug: string;
  /** Optioneel — laat leeg als de titel buiten het kader staat. */
  title?: string;
  subtitle?: string;
}) {
  /** Remount bij Annuleren zodat de flow opnieuw begint. */
  const [resetKey, setResetKey] = useState(0);

  return (
    <div id="agenda" className="nieuw-booking nieuw-themed">
      {title ? <h3 className="nieuw-booking-title">{title}</h3> : null}
      {subtitle ? <p className="nieuw-booking-sub">{subtitle}</p> : null}
      <div className="nieuw-booking-body">
        <GuestBookingPanel
          key={resetKey}
          calendarSlug={slug}
          heading=""
          variant="default"
          onClose={() => setResetKey((k) => k + 1)}
        />
      </div>
    </div>
  );
}
