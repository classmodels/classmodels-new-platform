'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { CmText } from '@/components/CmText';

function SectionBlock({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-cm border border-line bg-white px-4 py-4 shadow-sm ${className}`}>{children}</div>
  );
}

function CheckBullet() {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-burgundy text-[10px] font-bold text-white"
      aria-hidden
    >
      ✓
    </span>
  );
}

function StepNum({ n }: { n: number }) {
  return (
    <span
      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-burgundy text-xs font-bold text-white"
      aria-hidden
    >
      {n}
    </span>
  );
}

const tab = (id: string) => `/portal/model?tab=${id}`;

function AsideInfoCard({
  titleKey,
  titleFallback,
  bodyKey,
  bodyFallback,
}: {
  titleKey: string;
  titleFallback: string;
  bodyKey: string;
  bodyFallback: string;
}) {
  return (
    <div className="border border-zinc-300 bg-white">
      <div className="border-b-2 border-burgundy bg-burgundy px-2 py-0.5">
        <CmText
          contentKey={titleKey}
          as="h3"
          className="text-[10px] font-bold uppercase leading-tight tracking-wide text-white"
          fallback={titleFallback}
        />
      </div>
      <div className="space-y-1.5 px-2 py-1.5 text-[11px] leading-snug text-ink/90">
        <CmText contentKey={bodyKey} as="div" className="space-y-1.5" fallback={bodyFallback} />
      </div>
    </div>
  );
}

export function ModelPortalHomeContent({
  userEmail,
  premiumReturn,
}: {
  userEmail: string;
  premiumReturn: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,34%)] lg:items-start">
        <div className="min-w-0 space-y-4 text-[13px] leading-snug text-ink/90">
          <SectionBlock>
            <CmText
              contentKey="portal.model.home.welcome.small"
              as="p"
              className="text-[13px] font-medium leading-snug text-ink"
              fallback="Welkom in je account."
            />
            <CmText
              contentKey="portal.model.home.welcome.title"
              as="h3"
              className="mt-2.5 font-serif text-lg font-semibold leading-snug text-ink md:text-xl"
              fallback="Welkom op het Modellenplatform van Class-Models"
            />
            <CmText
              contentKey="portal.model.home.welcome.body"
              as="p"
              className="mt-3 text-[13px] leading-snug text-ink/90"
              fallback="Gefeliciteerd met uw inschrijving bij Class-Models. Uw persoonlijk profiel is succesvol aangemaakt. Via dit platform beheert u als model uw gegevens, aanvragen en communicatie met het team. Een volledig en actueel profiel is essentieel om in aanmerking te komen voor opdrachten."
            />
            <div className="mt-4 rounded-cm border border-line bg-panel px-3 py-2.5">
              <CmText
                contentKey="portal.model.home.important.kicker"
                as="p"
                className="text-[11px] font-bold uppercase tracking-wide text-burgundy"
                fallback="Belangrijk"
              />
              <CmText
                contentKey="portal.model.home.important.body"
                as="p"
                className="mt-1.5 text-[13px] leading-snug text-ink/90"
                fallback="Om je account volledig te beheren, blijf je ingelogd. Je vindt alles in het menu links."
              />
            </div>
            {premiumReturn ? (
              <CmText
                contentKey="portal.model.home.premium.return"
                as="p"
                className="mt-3 rounded-cm border border-line bg-panel px-3 py-2 text-[13px] leading-snug text-ink"
                fallback="U bent terug van de betalingspagina. Premium wordt geactiveerd zodra de betaling is bevestigd."
              />
            ) : null}
          </SectionBlock>

          <SectionBlock>
            <div className="min-w-0 border-l-4 border-burgundy pl-3 md:pl-4">
              <CmText
                contentKey="portal.model.home.platformlist.title"
                as="h3"
                className="font-serif text-base font-semibold leading-snug text-ink md:text-lg"
                fallback="Wat u via het platform kunt regelen"
              />
              <CmText
                contentKey="portal.model.home.platformlist.intro"
                as="p"
                className="mt-1.5 text-[13px] leading-snug text-muted"
                fallback="Via uw account kunt u onder andere:"
              />
            </div>
            <ul className="mt-3 space-y-2 text-[13px] leading-snug text-ink/90">
              {[
                {
                  key: 'portal.model.home.platformlist.0',
                  fb: 'Registreren voor de verplichte opleiding',
                },
                {
                  key: 'portal.model.home.platformlist.1',
                  fb: 'Een afspraak maken voor het aanmaken van uw professionele portfolio',
                },
                {
                  key: 'portal.model.home.platformlist.2',
                  fb: 'Inschrijven voor de Try-Out modeshow (examenshow)',
                },
                {
                  key: 'portal.model.home.platformlist.3',
                  fb: 'Berichten sturen naar het Class-Models team',
                },
                {
                  key: 'portal.model.home.platformlist.4',
                  fb: 'Uw persoonlijke gegevens en maten beheren en actualiseren',
                },
              ].map((row) => (
                <li key={row.key} className="flex gap-3">
                  <CheckBullet />
                  <CmText contentKey={row.key} as="span" className="text-[13px] leading-snug text-ink/90" fallback={row.fb} />
                </li>
              ))}
            </ul>
          </SectionBlock>

          <SectionBlock>
            <CmText
              contentKey="portal.model.home.steps.title"
              as="h3"
              className="font-serif text-base font-semibold leading-snug text-ink md:text-lg"
              fallback="Verplichte eerste stappen (nieuwe modellen)"
            />
            <CmText
              contentKey="portal.model.home.steps.intro"
              as="p"
              className="mt-2.5 text-[13px] leading-snug text-muted"
              fallback="Om uw traject correct te starten, vragen wij u om deze stappen zo snel mogelijk in orde te brengen:"
            />
            <ul className="mt-3 list-none space-y-3">
              <li className="flex gap-3 text-[13px] leading-snug text-ink/90">
                <StepNum n={1} />
                <span>
                  <strong className="text-ink">
                    <CmText
                      contentKey="portal.model.home.steps.1.title"
                      as="span"
                      className="text-ink"
                      fallback="Registreren voor de opleiding"
                    />
                  </strong>
                  <br />
                  <CmText
                    contentKey="portal.model.home.steps.1.body"
                    as="span"
                    className="text-[13px] leading-snug text-ink/90"
                    fallback="Essentieel om de basis en werkwijze van het modellenwerk te beheersen."
                  />
                </span>
              </li>
              <li className="flex gap-3 text-[13px] leading-snug text-ink/90">
                <StepNum n={2} />
                <span>
                  <strong className="text-ink">
                    <CmText
                      contentKey="portal.model.home.steps.2.title"
                      as="span"
                      className="text-ink"
                      fallback="Afspraak maken voor uw portfolio"
                    />
                  </strong>
                  <br />
                  <CmText
                    contentKey="portal.model.home.steps.2.body"
                    as="span"
                    className="text-[13px] leading-snug text-ink/90"
                    fallback="Een professioneel portfolio is noodzakelijk om u correct te kunnen voorstellen aan klanten."
                  />
                </span>
              </li>
              <li className="flex gap-3 text-[13px] leading-snug text-ink/90">
                <StepNum n={3} />
                <span>
                  <strong className="text-ink">
                    <CmText
                      contentKey="portal.model.home.steps.3.title"
                      as="span"
                      className="text-ink"
                      fallback="Inschrijven voor de Try-Out modeshow"
                    />
                  </strong>
                  <br />
                  <CmText
                    contentKey="portal.model.home.steps.3.body"
                    as="span"
                    className="text-[13px] leading-snug text-ink/90"
                    fallback="Uw moment om vaardigheden en presentatie te tonen in een professionele setting."
                  />
                </span>
              </li>
            </ul>
            <CmText
              contentKey="portal.model.home.steps.outro"
              as="p"
              className="mt-3 text-[13px] leading-snug text-ink/90"
              fallback="Deze stappen zijn een voorwaarde om door te stromen naar verdere opdrachten binnen Class-Models."
            />
          </SectionBlock>

          <SectionBlock>
            <CmText
              contentKey="portal.model.home.profile.title"
              as="h3"
              className="font-serif text-base font-semibold leading-snug text-ink md:text-lg"
              fallback="Uw profiel (modellenfiche): altijd volledig en up-to-date"
            />
            <CmText
              contentKey="portal.model.home.profile.intro"
              as="p"
              className="mt-2.5 text-[13px] leading-snug text-muted"
              fallback="Uw modellenfiche is uw professionele visitekaartje. Zorg daarom dat uw profiel:"
            />
            <ul className="mt-3 space-y-2 text-[13px] leading-snug text-ink/90">
              {[
                {
                  key: 'portal.model.home.profile.0',
                  fb: 'Volledig is ingevuld',
                },
                {
                  key: 'portal.model.home.profile.1',
                  fb: 'Correcte maten bevat (laat u professioneel opmeten indien nodig)',
                },
                {
                  key: 'portal.model.home.profile.2',
                  fb: 'Regelmatig wordt gecontroleerd en bijgewerkt bij veranderingen (gewicht, haar, look, maten, beschikbaarheden, foto’s)',
                },
              ].map((row) => (
                <li key={row.key} className="flex gap-3">
                  <CheckBullet />
                  <CmText contentKey={row.key} as="span" className="text-[13px] leading-snug text-ink/90" fallback={row.fb} />
                </li>
              ))}
            </ul>
            <CmText
              contentKey="portal.model.home.profile.footer"
              as="p"
              className="mt-3 text-[13px] leading-snug text-ink/90"
              fallback="Daarnaast vragen wij u om regelmatig uw dashboard te controleren. Updates, berichten, aanvragen en belangrijke acties verschijnen daar. U bent zelf verantwoordelijk om uw gegevens en status actueel te houden."
            />
          </SectionBlock>

          <SectionBlock>
            <CmText
              contentKey="portal.model.home.professional.title"
              as="h3"
              className="font-serif text-base font-semibold leading-snug text-ink md:text-lg"
              fallback="Professioneel gedrag en samenwerking"
            />
            <CmText
              contentKey="portal.model.home.professional.intro"
              as="p"
              className="mt-2.5 text-[13px] leading-snug text-ink/90"
              fallback="U bent toegelaten tot Class-Models omdat wij geloven in uw potentieel. Uw succes hangt sterk samen met uw houding, betrouwbaarheid en professionaliteit. Daarom verwachten wij dat u:"
            />
            <ul className="mt-3 space-y-2 text-[13px] leading-snug text-ink/90">
              {[
                {
                  key: 'portal.model.home.professional.0',
                  fb: 'Respectvol communiceert met klanten, collega-modellen en het bureau; correct en punctueel aanwezig bent op afspraken en opdrachten',
                },
                {
                  key: 'portal.model.home.professional.1',
                  fb: 'Geen negatieve uitspraken of roddels verspreidt over Class-Models of andere modellen',
                },
                {
                  key: 'portal.model.home.professional.2',
                  fb: 'Geen interne informatie deelt met derden',
                },
                {
                  key: 'portal.model.home.professional.3',
                  fb: 'Zich professioneel gedraagt op en rond elke opdracht (online én offline)',
                },
              ].map((row) => (
                <li key={row.key} className="flex gap-3">
                  <CheckBullet />
                  <CmText contentKey={row.key} as="span" className="text-[13px] leading-snug text-ink/90" fallback={row.fb} />
                </li>
              ))}
            </ul>
            <CmText
              contentKey="portal.model.home.professional.footer"
              as="p"
              className="mt-3 text-[13px] leading-snug text-muted"
              fallback="Onprofessioneel gedrag kan ertoe leiden dat u niet langer wordt ingepland voor opdrachten. Wij bewaken hiermee de kwaliteit en reputatie van onze werking, in het belang van alle modellen."
            />
          </SectionBlock>
        </div>

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-4">
          <div>
            <CmText
              contentKey="portal.model.home.quick.title"
              as="h3"
              className="font-serif text-lg font-semibold text-ink"
              fallback="Direct regelen"
            />
            <div className="mt-3 space-y-2.5">
              <Link
                href={tab('opleiding')}
                className="block rounded-cm border border-line bg-panel px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-burgundy/30 hover:bg-white"
              >
                <CmText
                  contentKey="portal.model.home.quick.opleiding.title"
                  as="span"
                  className="text-sm font-semibold text-ink"
                  fallback="Opleiding inschrijven"
                />
                <CmText
                  contentKey="portal.model.home.quick.opleiding.sub"
                  as="span"
                  className="mt-0.5 block text-xs font-normal text-muted"
                  fallback="Verplichte eerste stap"
                />
              </Link>
              <Link
                href={tab('portfolio')}
                className="block rounded-cm border border-line bg-panel px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-burgundy/30 hover:bg-white"
              >
                <CmText
                  contentKey="portal.model.home.quick.portfolio.title"
                  as="span"
                  className="text-sm font-semibold text-ink"
                  fallback="Portfolio-afspraak"
                />
                <CmText
                  contentKey="portal.model.home.quick.portfolio.sub"
                  as="span"
                  className="mt-0.5 block text-xs font-normal text-muted"
                  fallback="Professioneel portfolio"
                />
              </Link>
              <Link
                href={tab('opdrachten')}
                className="block rounded-cm border border-line bg-panel px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-burgundy/30 hover:bg-white"
              >
                <CmText
                  contentKey="portal.model.home.quick.opdrachten.title"
                  as="span"
                  className="text-sm font-semibold text-ink"
                  fallback="Opdrachten"
                />
                <CmText
                  contentKey="portal.model.home.quick.opdrachten.sub"
                  as="span"
                  className="mt-0.5 block text-xs font-normal text-muted"
                  fallback="Openstaande aanvragen"
                />
              </Link>
              <Link
                href={tab('bericht')}
                className="block rounded-cm border border-line bg-panel px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-burgundy/30 hover:bg-white"
              >
                <CmText
                  contentKey="portal.model.home.quick.bericht.title"
                  as="span"
                  className="text-sm font-semibold text-ink"
                  fallback="Bericht naar het team"
                />
                <CmText
                  contentKey="portal.model.home.quick.bericht.sub"
                  as="span"
                  className="mt-0.5 block text-xs font-normal text-muted"
                  fallback="Direct contact"
                />
              </Link>
              <Link
                href={tab('profiel')}
                className="block rounded-cm border border-line bg-panel px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-burgundy/30 hover:bg-white"
              >
                <CmText
                  contentKey="portal.model.home.quick.profiel.title"
                  as="span"
                  className="text-sm font-semibold text-ink"
                  fallback="Modellenfiche bijwerken"
                />
                <CmText
                  contentKey="portal.model.home.quick.profiel.sub"
                  as="span"
                  className="mt-0.5 block text-xs font-normal text-muted"
                  fallback="Gegevens en maten"
                />
              </Link>
            </div>
          </div>

          <AsideInfoCard
            titleKey="portal.model.home.aside.opdrachten.title"
            titleFallback="Opdrachten en inschrijvingen"
            bodyKey="portal.model.home.aside.opdrachten.body"
            bodyFallback={`Op uw modellenfiche kunnen openstaande opdrachten verschijnen waarvoor de klant nog geen definitieve keuze heeft gemaakt. Wanneer u binnen het gevraagde profiel past, kunt u zich hiervoor inschrijven.

Let op: een groot deel van de opdrachten wordt rechtstreeks door klanten toegewezen aan een specifiek model. Deze opdrachten verschijnen niet altijd als “open opdracht” op het platform.`}
          />

          <AsideInfoCard
            titleKey="portal.model.home.aside.communicatie.title"
            titleFallback="Communicatie en transparantie"
            bodyKey="portal.model.home.aside.communicatie.body"
            bodyFallback={`Hoort u iets, twijfelt u aan informatie, of heeft u vragen? Neem dan altijd eerst contact op met de verantwoordelijke van Class-Models. In de sector circuleren vaak berichten die niet correct of onvolledig zijn. Wij verkiezen directe, duidelijke en correcte communicatie.`}
          />

          <AsideInfoCard
            titleKey="portal.model.home.aside.sms.title"
            titleFallback="Belangrijke communicatieregel (sms/bericht)"
            bodyKey="portal.model.home.aside.sms.body"
            bodyFallback={`Wanneer u ons een sms of bericht stuurt, vermeld altijd uw voornaam en familienaam. Wij werken geregeld met groepsberichten en meerdere gesprekken tegelijk. Berichten zonder naam kunnen niet als geldig antwoord worden verwerkt.`}
          />

          <AsideInfoCard
            titleKey="portal.model.home.aside.slot.title"
            titleFallback="Tot slot"
            bodyKey="portal.model.home.aside.slot.body"
            bodyFallback={`Wij wensen u veel succes binnen Class-Models en kijken uit naar een professionele en aangename samenwerking. Heeft u vragen of opmerkingen? Neem gerust contact op met het Class-Models team via het platform.`}
          />

          <p className="border-t border-zinc-200 px-2 pt-2 text-[10px] leading-tight text-muted">
            <CmText contentKey="portal.model.home.loggedIn.prefix" as="span" fallback="Ingelogd als" /> {userEmail}.
          </p>

          <div className="border border-burgundy/25 bg-zinc-50 px-2 py-1.5">
            <CmText
              contentKey="portal.model.home.remember.kicker"
              as="p"
              className="text-[10px] font-bold uppercase leading-tight tracking-wide text-burgundy"
              fallback="Onthouden"
            />
            <CmText
              contentKey="portal.model.home.remember.body"
              as="p"
              className="mt-1 text-[11px] leading-snug text-ink/85"
              fallback="Controleer regelmatig uw dashboard en houd uw profiel up-to-date — dat vergroot uw kansen op passende opdrachten."
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
