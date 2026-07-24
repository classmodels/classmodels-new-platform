'use client';

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
  return (
    <div id="agenda" className="nieuw-booking nieuw-themed">
      {title ? <h3 className="nieuw-booking-title">{title}</h3> : null}
      {subtitle ? <p className="nieuw-booking-sub">{subtitle}</p> : null}
      <div className="nieuw-booking-body">
        <GuestBookingPanel
          calendarSlug={slug}
          heading=""
          variant="default"
          onClose={() => {}}
        />
      </div>
    </div>
  );
}
