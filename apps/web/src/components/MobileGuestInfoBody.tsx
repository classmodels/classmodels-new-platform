'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DOELGROEPEN_CARDS,
  DOELGROEPEN_INTRO,
  GUEST_CONTACT_INFO,
  GUEST_SIMPLE_FAQ,
  GUEST_SIMPLE_FUNNEL,
  WAAROM_CHECKLIST,
} from '@/components/guest-portal/guest-portal-data';
import { getApiBase } from '@/lib/api';

const CARD = '#1b1a1a';
const LINE = 'rgba(214, 202, 182, 0.12)';
const TEXT = '#ece6da';
const TEXT_SOFT = 'rgba(232, 226, 214, 0.72)';
const ACCENT = '#d4af6a';
const CTA_BG = '#d4af6a';
const CTA_TEXT = '#14110a';

const F = GUEST_SIMPLE_FUNNEL;

export const MOBILE_INFO_KEYS = [
  'model-worden',
  'gratis-fotoshoot',
  'intake',
  'doelgroepen',
  'faq',
  'contact',
  'reviews',
] as const;

export type MobileInfoKey = (typeof MOBILE_INFO_KEYS)[number];

export function isMobileInfoKey(raw: string | null): raw is MobileInfoKey {
  return Boolean(raw && (MOBILE_INFO_KEYS as readonly string[]).includes(raw));
}

const TITLES: Record<MobileInfoKey, string> = {
  'model-worden': 'Model worden',
  'gratis-fotoshoot': 'Gratis testshoot',
  intake: 'Intake gesprek',
  doelgroepen: 'Doelgroepen',
  faq: 'Veelgestelde vragen',
  contact: 'Contact',
  reviews: 'Reviews',
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-4 py-4 shadow-sm" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      {children}
    </div>
  );
}

function BookBtn({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-4 flex w-full items-center justify-center rounded-lg px-3 py-3 text-[14px] font-bold"
      style={{ background: CTA_BG, color: CTA_TEXT }}
    >
      {label}
    </Link>
  );
}

export function mobileInfoTitle(key: MobileInfoKey): string {
  return TITLES[key];
}

export function MobileGuestInfoBody({ infoKey }: { infoKey: MobileInfoKey }) {
  if (infoKey === 'model-worden' || infoKey === 'gratis-fotoshoot' || infoKey === 'intake') {
    return (
      <div className="space-y-4">
        <Card>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
            {F.kicker}
          </p>
          <h2 className="m-0 mt-2 font-serif text-[20px] font-semibold" style={{ color: TEXT }}>
            {F.headline[0]} {F.headline[1]}
          </h2>
          <p className="m-0 mt-2 text-[14px] leading-relaxed" style={{ color: TEXT_SOFT }}>
            {F.lead}
          </p>
          <BookBtn href="/?m=guest&book=inschrijven" label="Maak een vrijblijvende afspraak →" />
        </Card>

        {F.steps.map((s) => (
          <Card key={s.n}>
            <p className="m-0 text-[11px] font-bold tracking-[0.18em]" style={{ color: ACCENT }}>
              {s.n}
            </p>
            <h2 className="m-0 mt-1 font-serif text-[17px] font-semibold" style={{ color: TEXT }}>
              {s.title}
            </h2>
            <p className="m-0 mt-1.5 text-[13.5px] leading-snug" style={{ color: TEXT_SOFT }}>
              {s.body}
            </p>
          </Card>
        ))}

        <Card>
          <h2 className="m-0 font-serif text-[18px] font-semibold" style={{ color: TEXT }}>
            Jouw keuze bij het boeken
          </h2>
          <ul className="m-0 mt-3 list-disc space-y-1.5 pl-5 text-[13.5px]" style={{ color: TEXT_SOFT }}>
            <li>
              <strong style={{ color: TEXT }}>Gratis testshoot + intake-gesprek</strong> — eerst voor de
              camera, daarna vrijblijvend advies.
            </li>
            <li>
              <strong style={{ color: TEXT }}>Alleen intake-gesprek</strong> — kennismaken in Hulshout
              zonder fotoshoot.
            </li>
          </ul>
          <ul className="m-0 mt-4 list-disc space-y-1.5 pl-5 text-[13.5px]" style={{ color: TEXT_SOFT }}>
            {WAAROM_CHECKLIST.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <BookBtn href="/?m=guest&book=inschrijven" label="Plan je kennismaking →" />
        </Card>
      </div>
    );
  }

  if (infoKey === 'doelgroepen') {
    return (
      <div className="space-y-4">
        <p className="m-0 text-[14px] leading-relaxed" style={{ color: TEXT_SOFT }}>
          {DOELGROEPEN_INTRO}
        </p>
        {DOELGROEPEN_CARDS.map((c) => (
          <Card key={c.title}>
            <h2 className="m-0 font-serif text-[17px] font-semibold" style={{ color: TEXT }}>
              {c.title}
            </h2>
            <p className="m-0 mt-1.5 text-[13.5px] leading-snug" style={{ color: TEXT_SOFT }}>
              {c.body}
            </p>
          </Card>
        ))}
        <BookBtn href="/?m=guest&book=inschrijven" label="Maak een afspraak →" />
      </div>
    );
  }

  if (infoKey === 'faq') {
    return (
      <div className="space-y-3">
        {GUEST_SIMPLE_FAQ.map((item) => (
          <Card key={item.q}>
            <h2 className="m-0 text-[15px] font-semibold" style={{ color: TEXT }}>
              {item.q}
            </h2>
            <p className="m-0 mt-2 text-[13.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>
              {item.a}
            </p>
          </Card>
        ))}
        <BookBtn href="/?m=guest&book=inschrijven" label="Klaar om te boeken?" />
      </div>
    );
  }

  if (infoKey === 'contact') {
    const c = GUEST_CONTACT_INFO;
    return (
      <div className="space-y-4">
        <Card>
          <p className="m-0 text-[14px] leading-relaxed" style={{ color: TEXT }}>
            <strong>{c.company}</strong>
            <br />
            {c.street}
            <br />
            {c.cityLine}
          </p>
          <p className="m-0 mt-3 text-[14px]">
            <a href={`mailto:${c.email}`} style={{ color: ACCENT }}>
              {c.email}
            </a>
            <br />
            <a href={`tel:${c.phoneTel}`} style={{ color: ACCENT }}>
              {c.phoneDisplay}
            </a>
          </p>
          <p className="m-0 mt-3 text-[12.5px]" style={{ color: TEXT_SOFT }}>
            Bank: {c.bankLabel}
            <br />
            IBAN: {c.iban}
            <br />
            BTW: {c.vat}
          </p>
          <a
            href={c.mapsOpenUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex w-full items-center justify-center rounded-lg px-3 py-3 text-[14px] font-bold"
            style={{ background: CTA_BG, color: CTA_TEXT }}
          >
            Open in Google Maps
          </a>
          <BookBtn href="/?m=guest&book=inschrijven" label="Afspraak maken →" />
        </Card>
        <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${LINE}`, minHeight: 220 }}>
          <iframe
            title="Kaart Class-Models"
            src={c.mapsEmbedUrl}
            style={{ width: '100%', height: 220, border: 0, display: 'block' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    );
  }

  // reviews
  return <MobileReviewsList />;
}

type ReviewRow = {
  id: string;
  title: string;
  body: string;
  authorName?: string | null;
  rating?: number | null;
};

function MobileReviewsList() {
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiBase()}/reviews`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data: unknown) => setItems(Array.isArray(data) ? (data as ReviewRow[]) : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="m-0 text-[14px]" style={{ color: TEXT_SOFT }}>
          Reviews laden…
        </p>
      ) : items.length === 0 ? (
        <Card>
          <p className="m-0 text-[14px] leading-relaxed" style={{ color: TEXT_SOFT }}>
            Nog geen reviews zichtbaar. Bekijk de volledige pagina om er één te schrijven.
          </p>
        </Card>
      ) : (
        items.slice(0, 12).map((r) => (
          <Card key={r.id}>
            <p className="m-0 text-[12px]" style={{ color: ACCENT }}>
              {'★'.repeat(Math.min(5, Math.max(0, r.rating ?? 5)))}
              {r.authorName ? ` · ${r.authorName}` : ''}
            </p>
            <h2 className="m-0 mt-1.5 text-[15px] font-semibold" style={{ color: TEXT }}>
              {r.title}
            </h2>
            <p className="m-0 mt-2 text-[13.5px] leading-relaxed" style={{ color: TEXT_SOFT }}>
              {r.body}
            </p>
          </Card>
        ))
      )}
      <BookBtn href="/?m=guest&book=inschrijven" label="Maak een afspraak →" />
      <BookBtn href="/reviews" label="Alle reviews / schrijf een review" />
    </div>
  );
}
