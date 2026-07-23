'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiBase } from '@/lib/api';
import {
  CASTING_PAGE,
  DOELGROEPEN_CARDS,
  DOELGROEPEN_INTRO,
  GRATIS_FOTOSHOOT_PAGE,
  GUEST_FAQ,
  INTAKE_GESPREK_PAGE,
  MODEL_WORDEN_STATS,
  WAAROM_CHECKLIST,
  WAAROM_PARAGRAPHS,
} from '@/components/guest-portal/guest-portal-data';
import { GuestBookingPanel } from '@/components/guest-portal/GuestBookingPanel';
import {
  quadMatrix3d,
  quadSourceSize,
  type Quad,
} from '@/components/model-portal/model-gallery-3d/quadTransform';

const SHEET_BASE = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
/**
 * Versienummer achter de video-/beeldadressen: verhoog dit bij elke nieuwe
 * versie van de bestanden, zodat de browser nooit een oude versie uit de
 * cache toont.
 */
const MEDIA_V = '?v=2026-07-23c';
/** Film 30 — de lift in het onthaal, met vier ronde knoppen links. */
const VIDEO_INTRO = `${SHEET_BASE}/videos/intro-lift-v2.mp4${MEDIA_V}`;
/** Film 31 — van de lift naar de hal van het gastenportaal (welkomstbord + deurbordjes). */
const VIDEO_HALL = `${SHEET_BASE}/videos/guest-hall.mp4${MEDIA_V}`;
/** Film 32 — de castingzaal. */
const VIDEO_CASTING = `${SHEET_BASE}/videos/casting-room.mp4${MEDIA_V}`;
/** Film 33 — de intakegesprek-kamer. */
const VIDEO_INTAKE = `${SHEET_BASE}/videos/intake-room.mp4${MEDIA_V}`;
/** Film 34 — de infozaal (bioscoop) achter 'Info model worden'. */
const VIDEO_INFO = `${SHEET_BASE}/videos/info-model-room.mp4${MEDIA_V}`;
/** Film 66 — de trailer die met geluid op het grote scherm van de infozaal speelt. */
const VIDEO_TRAILER = `${SHEET_BASE}/videos/info-trailer.mp4${MEDIA_V}`;
/** Film 6 — van de hal naar de gratis fotoshoot-ruimte; eindigt op het beeld van die pagina. */
const VIDEO_FOTOSHOOT_ENTRY = `${SHEET_BASE}/videos/fotoshoot-entry.mp4${MEDIA_V}`;
/** De infozaal verlaten — de mensen staan op en gaan naar beneden terwijl het licht dooft; daarna fade naar de hal. */
const VIDEO_INFO_EXIT = `${SHEET_BASE}/videos/info-exit.mp4${MEDIA_V}`;
/** Infozaal met gedoofd licht en met het licht aan. */
const IMG_INFO_DARK = `${SHEET_BASE}/images/info-room-dark.jpg${MEDIA_V}`;
const IMG_INFO_LIGHT = `${SHEET_BASE}/images/info-room-light.jpg${MEDIA_V}`;

/** Alle hotspot-coördinaten zijn gemeten in dit 1280x720-stelsel (films zijn 16:9). */
const BASE_W = 1280;
const BASE_H = 720;
/** Het beeld op 80% van de sitebreedte — zo blijft er boven/onder niets afgekapt. */
const WIDTH_FRACTION = 0.8;

/** Duur van de fade naar zwart bij 'Exit room' (ms). */
const FADE_MS = 700;

/** Alle films spelen op normale snelheid. */
const RIDE_SPEED = 1;

/** De trailer op het bioscoopscherm start pas na deze wachttijd (ms) nadat het licht dooft. */
const TRAILER_DELAY_MS = 3000;

type Phase =
  | 'intro' // film 30 speelt
  | 'lift' // eindbeeld film 30: liftknoppen klikbaar
  | 'hallRide' // film 31 speelt
  | 'hall' // eindbeeld film 31: deurbordjes klikbaar
  | 'castingRide' // film 32 speelt
  | 'casting' // eindbeeld film 32: exit room klikbaar
  | 'intakeRide' // film 33 speelt
  | 'intake' // eindbeeld film 33: exit room klikbaar
  | 'infoRide' // film 34 speelt
  | 'infoDim' // licht dooft (2.png) en film 61 speelt met geluid op het grote scherm
  | 'info' // licht weer aan (3.png): bordjes klikbaar, content op het grote scherm
  | 'infoExitRide' // film 5 speelt (de infozaal verlaten); daarna fade naar de hal
  | 'fotoshootRide' // film 6 speelt (naar de fotoshoot-ruimte)
  | 'fotoshoot'; // eindbeeld film 6: bordjes klikbaar, content in de grote kader

type Hotspot = { label: string; x: number; y: number; w: number; h: number };

/**
 * Liftknoppen (eindbeeld film 30) — vier ronde knoppen links in de lift.
 * Alleen een handje bij hover, geen zichtbare overlay.
 */
const LIFT_BUTTONS: (Hotspot & { action: 'gallery' | 'model' | 'client' | 'guest' })[] = [
  { label: 'Modellen gallerij', x: 33, y: 128, w: 96, h: 106, action: 'gallery' },
  { label: 'Modellen portaal', x: 33, y: 259, w: 96, h: 102, action: 'model' },
  { label: 'Klanten portaal', x: 43, y: 386, w: 86, h: 99, action: 'client' },
  { label: 'Gasten portaal', x: 43, y: 509, w: 86, h: 98, action: 'guest' },
];

/**
 * Bordjes boven de deur in de hal (eindbeeld film 31) — één rij van vier.
 * De nieuwe film heeft geen 'Intake-gesprek'-bordje meer; dat bordje wordt
 * daarom als HTML-paneel (rendered: true) op de lege plek links getekend,
 * zodat de intakekamer bereikbaar blijft.
 */
const HALL_SIGNS: (Hotspot & {
  action: 'info' | 'casting' | 'intake' | 'fotoshoot' | 'exit';
  rendered?: boolean;
})[] = [
  { label: 'Intake-gesprek', x: 214, y: 168, w: 70, h: 66, action: 'intake', rendered: true },
  { label: 'Exit room', x: 306, y: 168, w: 70, h: 66, action: 'exit' },
  { label: 'Info model worden', x: 396, y: 168, w: 71, h: 66, action: 'info' },
  { label: 'Casting', x: 488, y: 167, w: 71, h: 66, action: 'casting' },
  { label: 'Gratis fotoshoot', x: 580, y: 167, w: 72, h: 66, action: 'fotoshoot' },
];

/** Onderwerpen van de bordjes in de casting-, intake- en fotoshoot-ruimte. */
type RoomTopic = 'info' | 'afspraak' | 'faq' | 'doelgroepen';

/**
 * Bordjes op de rechtermuur van de castingzaal (eindbeeld film 32).
 * In de nieuwe film hangen er drie bordjes; 'Veel gestelde vragen' bestaat
 * hier niet meer (wel nog in de intakekamer en de infozaal).
 */
const CASTING_SIGNS: (Hotspot & { action: RoomTopic | 'exit' })[] = [
  { label: 'Info casting', x: 1028, y: 176, w: 70, h: 74, action: 'info' },
  { label: 'Afspraak maken', x: 1028, y: 275, w: 71, h: 72, action: 'afspraak' },
  { label: 'Exit room', x: 1028, y: 373, w: 71, h: 67, action: 'exit' },
];
/** Het beige vlak binnen de verlichte lijst in de castingzaal (rechte muur). */
const CASTING_FRAME: Quad = {
  tl: [604, 200],
  tr: [990, 200],
  br: [990, 484],
  bl: [604, 484],
};

/** Bordjes op de rechtermuur van de intakekamer (eindbeeld film 33). */
const INTAKE_SIGNS: (Hotspot & { action: RoomTopic | 'exit' })[] = [
  { label: 'Info intake-gesprek', x: 1008, y: 135, w: 62, h: 55, action: 'info' },
  { label: 'Afspraak maken', x: 1008, y: 201, w: 62, h: 49, action: 'afspraak' },
  { label: 'Veel gestelde vragen', x: 1008, y: 265, w: 62, h: 50, action: 'faq' },
  { label: 'Exit room', x: 1008, y: 325, w: 62, h: 52, action: 'exit' },
];
/**
 * Het beige vlak binnen de verlichte lijst in de intakekamer.
 * De muur staat licht in perspectief (rechts iets hoger dan links); de vier
 * hoekpunten zijn apart gemeten zodat de tekst de hoek van de kader volgt.
 */
const INTAKE_FRAME: Quad = {
  tl: [681, 160],
  tr: [960, 142],
  br: [960, 377],
  bl: [681, 358],
};

/**
 * Bordjes op de rechtermuur van de fotoshoot-ruimte (eindbeeld film 6).
 * In de nieuwe film hangen er vier bordjes; 'Veel gestelde vragen' bestaat
 * hier niet meer.
 */
const FOTOSHOOT_SIGNS: (Hotspot & { action: RoomTopic | 'exit' })[] = [
  { label: 'Info fotoshoot', x: 1052, y: 155, w: 117, h: 60, action: 'info' },
  { label: 'Afspraak maken gratis fotoshoot', x: 1052, y: 221, w: 117, h: 63, action: 'afspraak' },
  { label: 'Doelgroepen', x: 1052, y: 293, w: 117, h: 59, action: 'doelgroepen' },
  { label: 'Exit room', x: 1052, y: 354, w: 117, h: 60, action: 'exit' },
];
/** Het beige vlak binnen de verlichte lijst in de fotoshoot-ruimte (rechte muur). */
const FOTOSHOOT_FRAME: Quad = {
  tl: [670, 180],
  tr: [1020, 180],
  br: [1020, 478],
  bl: [670, 478],
};

/** Onderwerpen van de bordjes op de zijmuren van de infozaal. */
type InfoTopic =
  | 'veelgestelde-vragen'
  | 'doelgroepen'
  | 'info-model-worden'
  | 'reviews'
  | 'onze-klanten'
  | 'trailers';

/**
 * Menuteksten op de zijmuren van de infozaal. De teksten zitten in de
 * achtergrondafbeelding (bio.jpg) zelf; dit zijn alleen de onzichtbare
 * klikvlakken die exact op de teksttegels liggen. Ten allen tijde klikbaar;
 * de inhoud verschijnt op het grote scherm.
 */
const INFO_SIGNS: (Hotspot & { action: InfoTopic | 'exit' })[] = [
  // Linkermuur, van boven naar onder: Exit room, Gestelde vragen, Reviews, Doelgroepen.
  { label: 'Exit room', x: 300, y: 170, w: 100, h: 56, action: 'exit' },
  { label: 'Veel gestelde vragen', x: 300, y: 238, w: 100, h: 48, action: 'veelgestelde-vragen' },
  { label: 'Reviews', x: 300, y: 304, w: 100, h: 40, action: 'reviews' },
  { label: 'Doelgroepen', x: 298, y: 376, w: 100, h: 42, action: 'doelgroepen' },
  // Rechtermuur, van boven naar onder: Info model worden, Onze klanten, Trailers.
  { label: 'Info model worden', x: 905, y: 170, w: 105, h: 60, action: 'info-model-worden' },
  { label: 'Onze klanten', x: 915, y: 238, w: 95, h: 54, action: 'onze-klanten' },
  { label: 'Trailers try-out modeshows', x: 915, y: 302, w: 95, h: 46, action: 'trailers' },
];

/**
 * Het grote bioscoopdoek in de infozaal (1280x720-stelsel, gemeten op
 * bio.jpg). Iets ruimer dan het doek zelf zodat de trailer het scherm
 * volledig vult.
 */
const INFO_SCREEN = { x: 430, y: 184, w: 442, h: 244 };
/** 2x supersampling: content groot renderen en terugschalen → scherpe tekst op het doek. */
const INFO_SCREEN_SS = 2;

type InfoReview = {
  id: string;
  title: string;
  body: string;
  authorName?: string | null;
  rating?: number | null;
};

/** Zet een (uitgespeelde of nog niet gestarte) video vast op het laatste beeld. */
function holdLastFrame(v: HTMLVideoElement | null) {
  if (!v) return;
  v.pause();
  if (Number.isFinite(v.duration) && v.duration > 0) {
    v.currentTime = Math.max(0, v.duration - 0.05);
  }
}

/**
 * Spring naar (bijna) het einde en speel dat laatste stukje af: zo tekent de
 * browser het beeld gegarandeerd en blijft de video via 'ended' op het
 * laatste beeld staan — ook als de video nog niet geladen was.
 */
function seekToEnd(v: HTMLVideoElement | null) {
  if (!v) return;
  const land = () => {
    v.currentTime = Math.max(0, v.duration - 0.12);
    void v.play().catch(() => {});
  };
  if (Number.isFinite(v.duration) && v.duration > 0) land();
  else v.addEventListener('loadedmetadata', land, { once: true });
}

/** Kleuren voor de content op doek en wandkaders — donkere inkt en goud op de lichte ondergrond. */
const SCREEN_INK = '#1e1710';
const SCREEN_INK_SOFT = '#382c22';
const SCREEN_GOLD = '#8a6b45';

function ScreenHeading({ title }: { title: string }) {
  return (
    <header className="shrink-0">
      <h2 className="m-0 font-serif font-semibold leading-tight" style={{ fontSize: 55, color: SCREEN_INK }}>
        {title}
      </h2>
      <span
        aria-hidden
        className="mt-3 block h-[3px] w-44"
        style={{ background: `linear-gradient(to right, ${SCREEN_GOLD}, transparent)` }}
      />
    </header>
  );
}

/** Inhoud op het grote bioscoopdoek — dezelfde teksten als elders op de site. */
function InfoScreenContent({ topic, reviews }: { topic: InfoTopic; reviews: InfoReview[] | null }) {
  switch (topic) {
    case 'info-model-worden':
      return (
        <div>
          <ScreenHeading title="Model worden bij Class-Models" />
          {WAAROM_PARAGRAPHS.map((p) => (
            <p key={p} className="m-0 mt-5 font-sans leading-relaxed" style={{ fontSize: 29, color: SCREEN_INK }}>
              {p}
            </p>
          ))}
          <ul className="m-0 mt-6 list-none space-y-3 p-0">
            {WAAROM_CHECKLIST.map((b) => (
              <li key={b} className="flex gap-3 font-sans leading-snug" style={{ fontSize: 28, color: SCREEN_INK }}>
                <span aria-hidden style={{ color: SCREEN_GOLD }}>
                  ◆
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 grid grid-cols-4 gap-4">
            {MODEL_WORDEN_STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-lg px-3 py-4 text-center"
                style={{
                  background: 'linear-gradient(180deg, #3a2e20, #241d15)',
                  border: '1px solid rgba(190,150,95,0.55)',
                }}
              >
                <p className="m-0 font-serif font-bold" style={{ fontSize: 33, color: '#ffe9c4' }}>
                  {s.value}
                </p>
                <p className="m-0 mt-1 font-sans" style={{ fontSize: 20, color: 'rgba(255,233,196,0.85)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'veelgestelde-vragen':
      return (
        <div>
          <ScreenHeading title="Veelgestelde vragen" />
          <div className="mt-6 space-y-6">
            {GUEST_FAQ.map((f) => (
              <section key={f.q}>
                <h3 className="m-0 font-serif font-semibold" style={{ fontSize: 33, color: SCREEN_INK }}>
                  {f.q}
                </h3>
                <p className="m-0 mt-2 font-sans leading-snug" style={{ fontSize: 28, color: SCREEN_INK_SOFT }}>
                  {f.a}
                </p>
              </section>
            ))}
          </div>
        </div>
      );
    case 'doelgroepen':
      return (
        <div>
          <ScreenHeading title="Doelgroepen" />
          <p className="m-0 mt-5 font-sans leading-relaxed" style={{ fontSize: 29, color: SCREEN_INK }}>
            {DOELGROEPEN_INTRO}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {DOELGROEPEN_CARDS.map((c) => (
              <div
                key={c.title}
                className="rounded-lg px-4 py-4"
                style={{ background: 'rgba(138,107,69,0.10)', border: '1px solid rgba(138,107,69,0.4)' }}
              >
                <p className="m-0 font-serif font-semibold" style={{ fontSize: 29, color: SCREEN_INK }}>
                  {c.title}
                </p>
                <p className="m-0 mt-1.5 font-sans leading-snug" style={{ fontSize: 23, color: SCREEN_INK_SOFT }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'reviews':
      return (
        <div>
          <ScreenHeading title="Hoe onze modellen hun avontuur ervaren" />
          {reviews === null ? (
            <p className="m-0 mt-6 font-sans" style={{ fontSize: 28, color: SCREEN_INK_SOFT }}>
              Reviews laden…
            </p>
          ) : reviews.length === 0 ? (
            <p className="m-0 mt-6 font-sans" style={{ fontSize: 28, color: SCREEN_INK_SOFT }}>
              Nog geen reviews beschikbaar.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-lg px-4 py-4"
                  style={{ background: 'rgba(138,107,69,0.10)', border: '1px solid rgba(138,107,69,0.4)' }}
                >
                  <h3 className="m-0 font-serif font-semibold" style={{ fontSize: 27, color: SCREEN_INK }}>
                    {r.title}
                  </h3>
                  <p className="m-0 mt-1.5 font-sans leading-snug" style={{ fontSize: 22, color: SCREEN_INK_SOFT }}>
                    {r.body}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {r.authorName ? (
                      <p className="m-0 font-sans font-semibold" style={{ fontSize: 21, color: SCREEN_INK }}>
                        — {r.authorName}
                      </p>
                    ) : (
                      <span />
                    )}
                    {r.rating ? (
                      <span aria-label={`${r.rating} van 5 sterren`} style={{ fontSize: 22, color: '#b98a2f' }}>
                        {'★'.repeat(Math.min(5, Math.max(0, r.rating)))}
                        <span style={{ color: 'rgba(138,107,69,0.35)' }}>
                          {'★'.repeat(5 - Math.min(5, Math.max(0, r.rating)))}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      );
    case 'onze-klanten':
      return (
        <div>
          <ScreenHeading title="Onze klanten" />
          <p className="m-0 mt-5 font-sans leading-relaxed" style={{ fontSize: 29, color: SCREEN_INK }}>
            Onze modellen werken voor uiteenlopende merken en klanten: campagnes, fotoshoots,
            reclame, events en modeshows. Van lokale zaken tot grote namen — voor elke opdracht
            zoeken we het profiel dat er het best bij past.
          </p>
          <p className="m-0 mt-4 font-sans leading-relaxed" style={{ fontSize: 29, color: SCREEN_INK }}>
            Bent u zelf op zoek naar modellen voor uw merk of evenement? Via het klantenportaal
            plaatst u eenvoudig een aanvraag en stellen wij een selectie voor die aansluit bij uw
            campagne.
          </p>
          <ul className="m-0 mt-6 list-none space-y-3 p-0">
            {[
              'Campagnes en reclame voor merken en winkels',
              'Fotoshoots voor catalogi, webshops en social media',
              'Events, beurzen en productlanceringen',
              'Modeshows en try-outs',
            ].map((b) => (
              <li key={b} className="flex gap-3 font-sans leading-snug" style={{ fontSize: 28, color: SCREEN_INK }}>
                <span aria-hidden style={{ color: SCREEN_GOLD }}>
                  ◆
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'trailers':
      return (
        <div>
          <ScreenHeading title="Trailers — try-out modeshows" />
          <p className="m-0 mt-5 font-sans leading-relaxed" style={{ fontSize: 29, color: SCREEN_INK }}>
            Onze modellen schitteren op try-out modeshows: een echte show met publiek, styling en
            professionele begeleiding. De trailer speelt op dit scherm — klik op het bordje
            &lsquo;Trailers try-out modeshows&rsquo; om hem (opnieuw) te bekijken.
          </p>
          <p className="m-0 mt-4 font-sans leading-relaxed" style={{ fontSize: 29, color: SCREEN_INK }}>
            Zin om zelf mee te lopen? Boek een intakegesprek of doe mee aan de casting — de
            bordjes vind je in de hal van het gastenportaal.
          </p>
        </div>
      );
  }
}

type RoomId = 'casting' | 'intake' | 'fotoshoot';

function RoomHeading({ title }: { title: string }) {
  return (
    <header>
      <h2 className="m-0 font-serif font-bold leading-tight" style={{ fontSize: 43, color: SCREEN_INK }}>
        {title}
      </h2>
      <span
        aria-hidden
        className="mt-2.5 block h-[3px] w-36"
        style={{ background: `linear-gradient(to right, ${SCREEN_GOLD}, transparent)` }}
      />
    </header>
  );
}

function RoomBullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 mt-4 list-none space-y-2.5 p-0">
      {items.map((b) => (
        <li key={b} className="flex gap-3 font-sans leading-snug" style={{ fontSize: 24, color: SCREEN_INK }}>
          <span aria-hidden style={{ color: SCREEN_GOLD }}>
            ◆
          </span>
          <span className="min-w-0 flex-1">{b}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Inhoud op de grote wandkader in de casting-, intake- en fotoshoot-ruimte —
 * dezelfde teksten als op de oude pagina's van het gastenportaal.
 */
function RoomWallContent({ room, topic }: { room: RoomId; topic: RoomTopic }) {
  if (topic === 'faq') {
    return (
      <div>
        <RoomHeading title="Veelgestelde vragen" />
        <div className="mt-5 space-y-5">
          {GUEST_FAQ.map((f) => (
            <section key={f.q}>
              <h3 className="m-0 font-serif font-semibold" style={{ fontSize: 27, color: SCREEN_INK }}>
                {f.q}
              </h3>
              <p className="m-0 mt-1.5 font-sans leading-snug" style={{ fontSize: 23, color: SCREEN_INK_SOFT }}>
                {f.a}
              </p>
            </section>
          ))}
        </div>
      </div>
    );
  }
  if (topic === 'doelgroepen') {
    return (
      <div>
        <RoomHeading title="Doelgroepen" />
        <p className="m-0 mt-4 font-sans leading-relaxed" style={{ fontSize: 24, color: SCREEN_INK }}>
          {DOELGROEPEN_INTRO}
        </p>
        <div className="mt-5 space-y-3">
          {DOELGROEPEN_CARDS.map((c) => (
            <div
              key={c.title}
              className="rounded-lg px-4 py-3"
              style={{ background: 'rgba(138,107,69,0.10)', border: '1px solid rgba(138,107,69,0.4)' }}
            >
              <p className="m-0 font-serif font-semibold" style={{ fontSize: 25, color: SCREEN_INK }}>
                {c.title}
              </p>
              <p className="m-0 mt-1 font-sans leading-snug" style={{ fontSize: 21, color: SCREEN_INK_SOFT }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (topic === 'afspraak') {
    const bySlug: Record<RoomId, { slug: string; heading: string }> = {
      casting: { slug: CASTING_PAGE.agendaSlug, heading: CASTING_PAGE.bookingSubject },
      intake: { slug: INTAKE_GESPREK_PAGE.agendaSlug, heading: INTAKE_GESPREK_PAGE.bookingSubject },
      fotoshoot: { slug: GRATIS_FOTOSHOOT_PAGE.agendaSlug, heading: GRATIS_FOTOSHOOT_PAGE.bookingSubject },
    };
    const cfg = bySlug[room];
    return (
      <div className="cm-room-booking">
        <RoomHeading title="Afspraak maken" />
        <div className="mt-3">
          <GuestBookingPanel calendarSlug={cfg.slug} heading={cfg.heading} variant="default" onClose={() => {}} />
        </div>
      </div>
    );
  }
  // topic === 'info'
  if (room === 'intake') {
    return (
      <div>
        <RoomHeading title="Intake gesprek" />
        <h3 className="m-0 mt-5 font-serif font-semibold" style={{ fontSize: 29, color: SCREEN_INK }}>
          {INTAKE_GESPREK_PAGE.howTitle}
        </h3>
        <ol className="m-0 mt-3 list-none space-y-2.5 p-0">
          {INTAKE_GESPREK_PAGE.steps.map((s, i) => (
            <li key={s} className="flex gap-3 font-sans leading-snug" style={{ fontSize: 24, color: SCREEN_INK }}>
              <span className="font-serif font-bold" style={{ color: SCREEN_GOLD }}>
                {i + 1}.
              </span>
              <span className="min-w-0 flex-1">{s}</span>
            </li>
          ))}
        </ol>
        <h3 className="m-0 mt-6 font-serif font-semibold" style={{ fontSize: 29, color: SCREEN_INK }}>
          {INTAKE_GESPREK_PAGE.whyTitle}
        </h3>
        <RoomBullets items={WAAROM_CHECKLIST} />
      </div>
    );
  }
  const page = room === 'casting' ? CASTING_PAGE : GRATIS_FOTOSHOOT_PAGE;
  return (
    <div>
      <RoomHeading title={room === 'casting' ? 'Casting' : 'Gratis fotoshoot'} />
      <h3 className="m-0 mt-5 font-serif font-semibold" style={{ fontSize: 29, color: SCREEN_INK }}>
        {page.expectTitle}
      </h3>
      <RoomBullets items={page.expectBullets} />
      <h3 className="m-0 mt-6 font-serif font-semibold" style={{ fontSize: 29, color: SCREEN_INK }}>
        {page.whyTitle}
      </h3>
      <p className="m-0 mt-2.5 font-sans leading-relaxed" style={{ fontSize: 24, color: SCREEN_INK }}>
        {page.whyParagraph}
      </p>
    </div>
  );
}

/**
 * Beginpagina: film 30 (lift) → eindbeeld met klikbare liftknoppen →
 * Gastenportaal start film 31 (hal) → op het eindbeeld zijn de deurbordjes klikbaar:
 * Info model worden → film 34, Casting → film 32, Intake gesprek → film 33,
 * Gratis fotoshoot → film 6. In elke ruimte zijn de wandbordjes klikbaar en
 * komt de bijbehorende content op de grote wandkader. 'Exit room' in een
 * ruimte fadet altijd terug naar het eindbeeld van film 31; 'Exit room' in de
 * hal fadet terug naar de lift. Tijdens elke film staat rechtsonder een knop
 * 'Overslaan'.
 */
export function BeginLiftExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shellRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const hallRef = useRef<HTMLVideoElement>(null);
  const castingRef = useRef<HTMLVideoElement>(null);
  const intakeRef = useRef<HTMLVideoElement>(null);
  const infoRef = useRef<HTMLVideoElement>(null);
  const trailerRef = useRef<HTMLVideoElement>(null);
  const infoExitRef = useRef<HTMLVideoElement>(null);
  const fotoshootRef = useRef<HTMLVideoElement>(null);
  const fadeTimer = useRef<number | null>(null);
  /** Wachttijd voordat de trailer op het scherm start nadat het licht dooft. */
  const trailerDelayTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  /** De trailer is echt begonnen met spelen (pas dan wordt hij zichtbaar op het doek). */
  const [trailerStarted, setTrailerStarted] = useState(false);
  const [scale, setScale] = useState(1);
  /** Zwarte overlay voor de exit room-overgang: uitfaden → wisselen → infaden. */
  const [faded, setFaded] = useState(false);
  /** Gekozen onderwerp op het grote scherm van de infozaal. */
  const [infoTopic, setInfoTopic] = useState<InfoTopic>('info-model-worden');
  /** Gekozen onderwerp op de wandkader in de casting-, intake- en fotoshoot-ruimte. */
  const [roomTopic, setRoomTopic] = useState<RoomTopic>('info');
  /** Geluid van de trailer (film 61) — knop onderaan in het zwarte gedeelte. */
  const [trailerMuted, setTrailerMuted] = useState(false);
  const [reviews, setReviews] = useState<InfoReview[] | null>(null);

  /**
   * 80% van de breedte, maar nooit hoger dan de ruimte onder de zwarte menubalk:
   * de film begint direct onder de balk en wordt onderaan niet afgekapt.
   */
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const top = el.getBoundingClientRect().top;
      const availH = Math.max(300, window.innerHeight - Math.max(0, top));
      setScale(Math.min((w * WIDTH_FRACTION) / BASE_W, availH / BASE_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(
    () => () => {
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
      if (trailerDelayTimer.current) window.clearTimeout(trailerDelayTimer.current);
    },
    [],
  );

  const cancelTrailerDelay = useCallback(() => {
    if (trailerDelayTimer.current) {
      window.clearTimeout(trailerDelayTimer.current);
      trailerDelayTimer.current = null;
    }
  }, []);

  /** Autoplay kan geblokkeerd zijn; dan tonen we meteen het eindbeeld met de knoppen. */
  useEffect(() => {
    const v = introRef.current;
    if (!v) return;
    v.playbackRate = RIDE_SPEED;
    const p = v.play();
    if (p) {
      p.catch(() => {
        holdLastFrame(v);
        setPhase('lift');
      });
    }
  }, []);

  const startHall = useCallback(() => {
    const v = hallRef.current;
    if (!v) {
      setPhase('hall');
      return;
    }
    v.currentTime = 0;
    v.playbackRate = RIDE_SPEED;
    // Pas van beeld wisselen als de film echt speelt — zo is er geen zwart beeld.
    v.play()
      .then(() => {
        introRef.current?.pause();
        setPhase('hallRide');
      })
      .catch(() => {
        introRef.current?.pause();
        holdLastFrame(v);
        setPhase('hall');
      });
  }, []);

  const startCasting = useCallback(() => {
    setRoomTopic('info');
    const v = castingRef.current;
    if (!v) {
      setPhase('casting');
      return;
    }
    v.currentTime = 0;
    v.playbackRate = RIDE_SPEED;
    v.play()
      .then(() => setPhase('castingRide'))
      .catch(() => {
        holdLastFrame(v);
        setPhase('casting');
      });
  }, []);

  const startIntake = useCallback(() => {
    setRoomTopic('info');
    const v = intakeRef.current;
    if (!v) {
      setPhase('intake');
      return;
    }
    v.currentTime = 0;
    v.playbackRate = RIDE_SPEED;
    v.play()
      .then(() => setPhase('intakeRide'))
      .catch(() => {
        holdLastFrame(v);
        setPhase('intake');
      });
  }, []);

  /**
   * Na film 34 dooft het licht en speelt film 66 met geluid op het grote
   * scherm — pas na een korte wachttijd van 3 seconden. Lukt afspelen met
   * geluid niet (autoplay-beleid), dan starten we gedempt en kan het geluid
   * met de knop weer aan.
   */
  const startTrailer = useCallback(() => {
    setPhase('infoDim');
    setTrailerStarted(false);
    const v = trailerRef.current;
    if (!v) {
      setPhase('info');
      return;
    }
    v.currentTime = 0;
    v.muted = false;
    setTrailerMuted(false);
    if (trailerDelayTimer.current) window.clearTimeout(trailerDelayTimer.current);
    trailerDelayTimer.current = window.setTimeout(() => {
      trailerDelayTimer.current = null;
      v.play()
        .then(() => setTrailerStarted(true))
        .catch(() => {
          v.muted = true;
          setTrailerMuted(true);
          v.play()
            .then(() => setTrailerStarted(true))
            .catch(() => setPhase('info'));
        });
    }, TRAILER_DELAY_MS);
  }, []);

  const startInfo = useCallback(() => {
    const v = infoRef.current;
    if (!v) {
      // Film 34 kan niet spelen → meteen door naar de trailer in de donkere zaal.
      startTrailer();
      return;
    }
    v.currentTime = 0;
    v.playbackRate = RIDE_SPEED;
    v.play()
      .then(() => setPhase('infoRide'))
      .catch(() => startTrailer());
  }, [startTrailer]);

  /** Reviews pas ophalen wanneer het onderwerp voor het eerst gekozen wordt. */
  useEffect(() => {
    if (infoTopic !== 'reviews' || reviews !== null) return;
    fetch(`${getApiBase()}/reviews`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data: unknown) => setReviews(Array.isArray(data) ? (data as InfoReview[]) : []))
      .catch(() => setReviews([]));
  }, [infoTopic, reviews]);

  /**
   * Exit room: de pagina fadet uit naar zwart en fadet daarna altijd in op het
   * eindbeeld van film 31 (de hal). Er wordt nooit teruggegaan naar de
   * beginpagina — die zie je alleen bij het betreden van de site.
   */
  const fadeToHall = useCallback(() => {
    cancelTrailerDelay();
    setFaded(true);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      castingRef.current?.pause();
      intakeRef.current?.pause();
      infoRef.current?.pause();
      trailerRef.current?.pause();
      infoExitRef.current?.pause();
      fotoshootRef.current?.pause();
      seekToEnd(hallRef.current);
      setPhase('hall');
      // Eén frame wachten zodat het nieuwe beeld al klaarstaat achter het zwart.
      fadeTimer.current = window.setTimeout(() => setFaded(false), 120);
    }, FADE_MS);
  }, [cancelTrailerDelay]);

  /**
   * Exit room in de hal: fade naar zwart en land op het eindbeeld van film 30 —
   * de lift, waar de knoppen naar de andere portalen klikbaar zijn.
   */
  const fadeToLift = useCallback(() => {
    setFaded(true);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      hallRef.current?.pause();
      seekToEnd(introRef.current);
      setPhase('lift');
      fadeTimer.current = window.setTimeout(() => setFaded(false), 120);
    }, FADE_MS);
  }, []);

  /**
   * De infozaal verlaten: film 5 speelt (het licht dooft en je gaat naar
   * buiten); als die gedaan is, fadet het beeld naar de hal van film 31.
   */
  const startInfoExit = useCallback(() => {
    cancelTrailerDelay();
    trailerRef.current?.pause();
    const v = infoExitRef.current;
    if (!v) {
      fadeToHall();
      return;
    }
    v.currentTime = 0;
    v.playbackRate = RIDE_SPEED;
    v.play()
      .then(() => setPhase('infoExitRide'))
      .catch(() => fadeToHall());
  }, [cancelTrailerDelay, fadeToHall]);

  /**
   * Gratis fotoshoot: film 6 speelt (van de hal naar de fotoshoot-ruimte) en
   * blijft op het eindbeeld staan; daar zijn de bordjes klikbaar en komt de
   * content in de grote wandkader.
   */
  const startFotoshoot = useCallback(() => {
    setRoomTopic('info');
    const v = fotoshootRef.current;
    if (!v) {
      setPhase('fotoshoot');
      return;
    }
    v.currentTime = 0;
    v.playbackRate = RIDE_SPEED;
    v.play()
      .then(() => setPhase('fotoshootRide'))
      .catch(() => {
        holdLastFrame(v);
        setPhase('fotoshoot');
      });
  }, []);

  /** Bordjes in de casting-, intake- en fotoshoot-ruimte. */
  const onRoomSign = useCallback(
    (action: RoomTopic | 'exit') => {
      if (action === 'exit') {
        fadeToHall();
        return;
      }
      setRoomTopic(action);
    },
    [fadeToHall],
  );

  /** Bordjes op de zijmuren van de infozaal — ten allen tijde klikbaar. */
  const onInfoSign = useCallback(
    (action: InfoTopic | 'exit') => {
      if (action === 'exit') {
        startInfoExit();
        return;
      }
      if (action === 'trailers') {
        // Licht dooft en de trailer speelt (opnieuw) op het grote scherm.
        startTrailer();
        return;
      }
      cancelTrailerDelay();
      trailerRef.current?.pause();
      setInfoTopic(action);
      setPhase('info');
    },
    [cancelTrailerDelay, startInfoExit, startTrailer],
  );

  /**
   * Direct naar het eindbeeld van film 31 (de hal): kort zwart, dan infaden op
   * het eindbeeld — zonder de film af te spelen.
   */
  const jumpToHall = useCallback(() => {
    cancelTrailerDelay();
    setFaded(true);
    introRef.current?.pause();
    castingRef.current?.pause();
    intakeRef.current?.pause();
    infoRef.current?.pause();
    trailerRef.current?.pause();
    infoExitRef.current?.pause();
    fotoshootRef.current?.pause();
    setPhase('hall');
    seekToEnd(hallRef.current);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => setFaded(false), 450);
  }, [cancelTrailerDelay]);

  /**
   * `/?go=guest` (Gastenportaal in de menubalk) en `/?go=hall` (exit room
   * vanaf een andere pagina) → direct uitfaden en infaden op het eindbeeld
   * van film 31 (de hal). De parameter wordt daarna uit de URL gehaald zodat
   * een volgende klik op de menubalk opnieuw werkt.
   */
  const goParam = searchParams.get('go');
  useEffect(() => {
    if (!goParam) return;
    if (goParam === 'guest' || goParam === 'hall') jumpToHall();
    router.replace('/', { scroll: false });
  }, [goParam, jumpToHall, router]);

  const onLiftButton = useCallback(
    (action: 'gallery' | 'model' | 'client' | 'guest') => {
      if (action === 'gallery') {
        router.push('/portal/model/modellenwand');
        return;
      }
      if (action === 'model') {
        router.push('/lobby?tab=model');
        return;
      }
      if (action === 'client') {
        router.push('/lobby?tab=client');
        return;
      }
      startHall();
    },
    [router, startHall],
  );

  const onHallSign = useCallback(
    (action: 'info' | 'casting' | 'intake' | 'fotoshoot' | 'exit') => {
      if (action === 'info') {
        startInfo();
        return;
      }
      if (action === 'casting') {
        startCasting();
        return;
      }
      if (action === 'intake') {
        startIntake();
        return;
      }
      if (action === 'fotoshoot') {
        // Film 6 speelt naar de fotoshoot-ruimte en blijft op het eindbeeld staan.
        startFotoshoot();
        return;
      }
      // Exit room in de hal → terug naar de lift, waar de knoppen naar de
      // andere portalen klikbaar zijn.
      fadeToLift();
    },
    [startInfo, startCasting, startIntake, startFotoshoot, fadeToLift],
  );

  /**
   * Overslaan: spoel de film die nu speelt door naar (bijna) het einde; het
   * 'ended'-event zorgt daarna vanzelf voor de juiste vervolgstap.
   */
  const skipFilm = useCallback(() => {
    const byPhase: Partial<Record<Phase, HTMLVideoElement | null>> = {
      intro: introRef.current,
      hallRide: hallRef.current,
      castingRide: castingRef.current,
      intakeRide: intakeRef.current,
      infoRide: infoRef.current,
      infoExitRide: infoExitRef.current,
      fotoshootRide: fotoshootRef.current,
      infoDim: trailerRef.current,
    };
    const v = byPhase[phase];
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    if (phase === 'infoDim') {
      // Wachttijd van de trailer overslaan en meteen naar het einde spoelen.
      cancelTrailerDelay();
      setTrailerStarted(true);
    }
    v.currentTime = Math.max(0, v.duration - 0.15);
    void v.play().catch(() => {});
  }, [phase, cancelTrailerDelay]);

  /** Er speelt een film → de knop 'Overslaan' staat rechtsonder. */
  const filmPlaying =
    phase === 'intro' ||
    phase === 'hallRide' ||
    phase === 'castingRide' ||
    phase === 'intakeRide' ||
    phase === 'infoRide' ||
    phase === 'infoExitRide' ||
    phase === 'fotoshootRide' ||
    phase === 'infoDim';

  /** Onzichtbare klikvlakken: alleen een handje bij hover, geen zichtbare overlay. */
  const hotspotClass = 'absolute cursor-pointer bg-transparent outline-none';

  const videoClass = (visible: boolean) =>
    `absolute inset-0 h-full w-full select-none object-fill ${visible ? 'opacity-100' : 'opacity-0'}`;

  return (
    <div
      ref={shellRef}
      className="relative w-full overflow-hidden bg-black"
      style={{ height: Math.round(BASE_H * scale) }}
    >
      <div
        className="absolute left-1/2 top-0"
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* Film 30 — de lift; blijft op het laatste beeld staan (geen controls). */}
        <video
          ref={introRef}
          src={VIDEO_INTRO}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('lift')}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'intro' || phase === 'lift')}
        />

        {/* Film 31 — naar de hal van het gastenportaal; blijft op het laatste beeld staan. */}
        <video
          ref={hallRef}
          src={VIDEO_HALL}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('hall')}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'hallRide' || phase === 'hall')}
        />

        {/* Film 32 — de castingzaal. */}
        <video
          ref={castingRef}
          src={VIDEO_CASTING}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('casting')}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'castingRide' || phase === 'casting')}
        />

        {/* Film 33 — de intakegesprek-kamer. */}
        <video
          ref={intakeRef}
          src={VIDEO_INTAKE}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('intake')}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'intakeRide' || phase === 'intake')}
        />

        {/* Film 34 — de infozaal (Info model worden); daarna dooft het licht. */}
        <video
          ref={infoRef}
          src={VIDEO_INFO}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={startTrailer}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'infoRide' || phase === 'infoDim' || phase === 'info')}
        />

        {/* Film 5 — de infozaal verlaten; daarna fade naar de hal. */}
        <video
          ref={infoExitRef}
          src={VIDEO_INFO_EXIT}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={fadeToHall}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'infoExitRide')}
        />

        {/* Film 6 — naar de fotoshoot-ruimte; blijft op het eindbeeld staan. */}
        <video
          ref={fotoshootRef}
          src={VIDEO_FOTOSHOOT_ENTRY}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('fotoshoot')}
          onContextMenu={(e) => e.preventDefault()}
          className={videoClass(phase === 'fotoshootRide' || phase === 'fotoshoot')}
        />

        {/* Infozaal met gedoofd licht (2.png) — fadet in over het eindbeeld van film 34. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMG_INFO_DARK}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
          style={{ opacity: phase === 'infoDim' ? 1 : 0, transition: 'opacity 900ms ease-in-out' }}
        />

        {/* Infozaal met het licht aan (3.png) — fadet in als de trailer gedaan is. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMG_INFO_LIGHT}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
          style={{ opacity: phase === 'info' ? 1 : 0, transition: 'opacity 900ms ease-in-out' }}
        />

        {/* Film 66 — de trailer, met geluid, op het grote scherm in de donkere
            zaal. Wordt pas zichtbaar zodra hij echt speelt (na de wachttijd). */}
        <video
          ref={trailerRef}
          src={VIDEO_TRAILER}
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => setPhase('info')}
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute select-none object-fill ${phase === 'infoDim' && trailerStarted ? 'opacity-100' : 'opacity-0'}`}
          style={{
            left: INFO_SCREEN.x,
            top: INFO_SCREEN.y,
            width: INFO_SCREEN.w,
            height: INFO_SCREEN.h,
            transition: 'opacity 900ms ease-in-out',
            pointerEvents: 'none',
          }}
        />

        {/* Content op het grote scherm — als het licht weer aan is. */}
        {phase === 'info' ? (
          <div
            className="absolute"
            style={{ left: INFO_SCREEN.x, top: INFO_SCREEN.y, width: INFO_SCREEN.w, height: INFO_SCREEN.h }}
          >
            {/*
              Bron 2x zo groot gerenderd (supersampling) en teruggeschaald →
              gestoken scherpe tekst op het doek. Scrollen kan op het doek zelf.
            */}
            <div
              key={infoTopic}
              className="overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                width: INFO_SCREEN.w * INFO_SCREEN_SS,
                height: INFO_SCREEN.h * INFO_SCREEN_SS,
                transform: `scale(${1 / INFO_SCREEN_SS})`,
                transformOrigin: '0 0',
                padding: '34px 46px 40px',
                animation: 'beginScreenFade 480ms ease-out',
              }}
            >
              <InfoScreenContent topic={infoTopic} reviews={reviews} />
            </div>
          </div>
        ) : null}

        {/* Menuteksten op de zijmuren van de infozaal — de teksten zitten in de
            achtergrondafbeelding; dit zijn de onzichtbare klikvlakken erop. */}
        {phase === 'infoDim' || phase === 'info'
          ? INFO_SIGNS.map((s) => (
              <button
                key={s.label}
                type="button"
                aria-label={s.label}
                title={s.label}
                onClick={() => onInfoSign(s.action)}
                className={hotspotClass}
                style={{ left: s.x, top: s.y, width: s.w, height: s.h, zIndex: 10 }}
              />
            ))
          : null}

        {/* Liftknoppen — pas klikbaar op het eindbeeld van film 30. */}
        {phase === 'lift'
          ? LIFT_BUTTONS.map((b) => (
              <button
                key={b.label}
                type="button"
                aria-label={b.label}
                title={b.label}
                onClick={() => onLiftButton(b.action)}
                className={`${hotspotClass} rounded-full`}
                style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
              />
            ))
          : null}

        {/* Deurbordjes in de hal — pas klikbaar op het eindbeeld van film 31.
            Het bordje 'Intake-gesprek' staat niet in de nieuwe film en wordt
            als passend paneel op de lege plek links getekend. */}
        {phase === 'hall'
          ? HALL_SIGNS.map((s) =>
              s.rendered ? (
                <button
                  key={s.label}
                  type="button"
                  aria-label={s.label}
                  title={s.label}
                  onClick={() => onHallSign(s.action)}
                  className={`${hotspotClass} flex items-center justify-center text-center`}
                  style={{
                    left: s.x,
                    top: s.y,
                    width: s.w,
                    height: s.h,
                    background: 'linear-gradient(180deg, #efe6d8, #e3d7c4)',
                    border: '2px solid #f7f1e6',
                    borderRadius: 2,
                    boxShadow: '0 0 12px rgba(255,244,220,0.85), 0 1px 3px rgba(0,0,0,0.25)',
                    color: '#2b2419',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 11,
                    lineHeight: 1.2,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    padding: '2px 4px',
                  }}
                >
                  Intake gesprek
                </button>
              ) : (
                <button
                  key={s.label}
                  type="button"
                  aria-label={s.label}
                  title={s.label}
                  onClick={() => onHallSign(s.action)}
                  className={hotspotClass}
                  style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
                />
              ),
            )
          : null}

        {/* Casting-, intake- en fotoshoot-ruimte: bordjes klikbaar + content op de wandkader. */}
        {(
          [
            { room: 'casting' as const, active: phase === 'casting', signs: CASTING_SIGNS, frame: CASTING_FRAME },
            { room: 'intake' as const, active: phase === 'intake', signs: INTAKE_SIGNS, frame: INTAKE_FRAME },
            { room: 'fotoshoot' as const, active: phase === 'fotoshoot', signs: FOTOSHOOT_SIGNS, frame: FOTOSHOOT_FRAME },
          ] as const
        ).map(({ room, active, signs, frame }) =>
          active ? (
            <div key={room} className="absolute inset-0">
              {signs.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  aria-label={s.label}
                  title={s.label}
                  onClick={() => onRoomSign(s.action)}
                  className={hotspotClass}
                  style={{ left: s.x, top: s.y, width: s.w, height: s.h, zIndex: 10 }}
                />
              ))}
              {(() => {
                /*
                 * De content wordt met een matrix3d op de vier gemeten
                 * hoekpunten van de kader gelegd, zodat hij het perspectief
                 * van (schuine) muren volgt. 2x supersampling houdt de tekst
                 * scherp. Scrollen kan gewoon binnen het vlak.
                 */
                const src = quadSourceSize(frame);
                const sw = Math.round(src.w * INFO_SCREEN_SS);
                const sh = Math.round(src.h * INFO_SCREEN_SS);
                return (
                  <div
                    className="absolute left-0 top-0"
                    style={{
                      width: sw,
                      height: sh,
                      transform: quadMatrix3d(sw, sh, frame),
                      transformOrigin: '0 0',
                    }}
                  >
                    <div
                      key={roomTopic}
                      className="h-full w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      style={{
                        padding: '26px 34px 32px',
                        animation: 'beginWallFade 480ms ease-out',
                      }}
                    >
                      <RoomWallContent room={room} topic={roomTopic} />
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null,
        )}

      </div>

      {/* Geluidsknop voor de trailer — buiten het beeld, onderaan in het zwarte gedeelte. */}
      {phase === 'infoDim' ? (
        <button
          type="button"
          onClick={() => {
            const v = trailerRef.current;
            if (!v) return;
            const next = !v.muted;
            v.muted = next;
            setTrailerMuted(next);
          }}
          className="absolute bottom-3 left-4 z-30 cursor-pointer rounded-full px-4 py-1.5 font-sans transition hover:opacity-85"
          style={{
            fontSize: 13,
            color: '#e9c780',
            background: 'rgba(20,16,12,0.85)',
            border: '1px solid rgba(233,199,128,0.5)',
            letterSpacing: '0.04em',
          }}
        >
          {trailerMuted ? '🔇 Geluid aan' : '🔊 Geluid uit'}
        </button>
      ) : null}

      {/* Overslaan — rechtsonder, zichtbaar zolang er een film speelt. */}
      {filmPlaying ? (
        <button
          type="button"
          aria-label="Overslaan"
          onClick={skipFilm}
          className="absolute bottom-3 right-4 z-30 cursor-pointer rounded-full px-4 py-1.5 font-sans transition hover:opacity-85"
          style={{
            fontSize: 13,
            color: '#e9c780',
            background: 'rgba(20,16,12,0.85)',
            border: '1px solid rgba(233,199,128,0.5)',
            letterSpacing: '0.04em',
          }}
        >
          Overslaan ≫
        </button>
      ) : null}

      {/* Zwarte fade-overlay voor de exit room-overgang. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-black"
        style={{
          opacity: faded ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      />

      <style>{`
        @keyframes beginScreenFade {
          from { opacity: 0; transform: scale(${1 / INFO_SCREEN_SS}) translateY(10px); }
          to { opacity: 1; transform: scale(${1 / INFO_SCREEN_SS}) translateY(0); }
        }
        @keyframes beginWallFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        /* Agendapaneel op de wandkader: donkere tekst, doorzichtige achtergrond. */
        .cm-room-booking [class*="bg-white"],
        .cm-room-booking [class*="bg-panel"],
        .cm-room-booking [class*="bg-zinc"] {
          background: transparent !important;
        }
        .cm-room-booking [class*="border-zinc"],
        .cm-room-booking [class*="border-line"] {
          border-color: rgba(42, 33, 24, 0.35) !important;
        }
        .cm-room-booking [class*="bg-burgundy"] {
          background: #131314 !important;
          border: 1px solid rgba(0, 0, 0, 0.5) !important;
          color: #ffffff !important;
        }
        .cm-room-booking [class*="text-burgundy"] {
          color: ${SCREEN_INK} !important;
        }
        .cm-room-booking [class*="border-burgundy"] {
          border-color: rgba(42, 33, 24, 0.45) !important;
        }
        .cm-room-booking,
        .cm-room-booking [class*="text-ink"],
        .cm-room-booking p,
        .cm-room-booking label,
        .cm-room-booking span,
        .cm-room-booking li,
        .cm-room-booking td,
        .cm-room-booking th,
        .cm-room-booking button {
          color: ${SCREEN_INK} !important;
          font-size: 24px !important;
          line-height: 1.4 !important;
        }
        .cm-room-booking h1,
        .cm-room-booking h2,
        .cm-room-booking h3 {
          color: ${SCREEN_INK} !important;
          font-size: 30px !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
        }
        .cm-room-booking input,
        .cm-room-booking select,
        .cm-room-booking textarea {
          background: rgba(255, 252, 246, 0.92) !important;
          border-color: rgba(42, 33, 24, 0.35) !important;
          color: #000000 !important;
          font-size: 22px !important;
        }
        .cm-room-booking [class*="shadow"] {
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
