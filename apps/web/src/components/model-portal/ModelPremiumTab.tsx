'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AuthUser } from '@/context/auth-context';
import {
  isPremiumPromoActive,
  PREMIUM_PROMO_PRICE,
  PREMIUM_YEARLY_PRICE,
} from '@/lib/premium-promo';
import { PremiumPromoCountdown } from '@/components/model-portal/PremiumPromoCountdown';
import { MODEL_BTN_GOLD } from './model-portal-buttons';

type PremiumInfo = {
  currency: string;
  amount: string;
  premiumDurationDays: number;
  promoActive?: boolean;
  promoEndsAt?: string;
  promoPrice?: string;
  yearlyPrice?: string;
  billingLabel?: string;
};

type Props = {
  user: AuthUser;
  premiumInfo: PremiumInfo | null;
  checkoutBusy: boolean;
  checkoutErr: string | null;
  premiumReturn: boolean;
  canCheckout: boolean;
  onStartCheckout: () => void;
};

export function ModelPremiumTab({
  user,
  premiumInfo,
  checkoutBusy,
  checkoutErr,
  premiumReturn,
  canCheckout,
  onStartCheckout,
}: Props) {
  const [promoActive, setPromoActive] = useState(() => isPremiumPromoActive());

  useEffect(() => {
    const tick = () => setPromoActive(isPremiumPromoActive());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const promoPrice = premiumInfo?.promoPrice ?? String(PREMIUM_PROMO_PRICE);
  const yearlyPrice = premiumInfo?.yearlyPrice ?? String(PREMIUM_YEARLY_PRICE);
  const price = promoActive ? (premiumInfo?.amount ?? promoPrice) : yearlyPrice;
  const active = user.isPremium;
  const until = user.premiumUntil ? new Date(user.premiumUntil).toLocaleDateString('nl-BE') : null;

  return (
    <div className="space-y-8">
      {premiumReturn && active ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <strong>Bedankt!</strong> Je betaling werd verwerkt. Premium staat nu actief op je account
          {until ? ` (geldig t.e.m. ${until}).` : user.premiumUntil === null ? ' (levenslang).' : '.'}
        </div>
      ) : null}
      {premiumReturn && !active ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          We verwerken je betaling. Vernieuw zo nodig even deze pagina; na bevestiging door Mollie zie je hier
          &quot;Premium actief&quot;.
        </div>
      ) : null}

      <header className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-900 via-[#2a1219] to-burgundyDeep px-6 py-10 text-white shadow-xl md:px-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Class Models</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">Premium modelaccount</h1>
            <p className="mt-4 text-sm leading-relaxed text-white/90">
              Volledige toegang tot je modellenportaal: opdrachten, agenda, portfolio en alle communicatie — met{' '}
              <strong className="text-white">pushberichten</strong> bij nieuwe acties en updates, zodat je niets mist.
            </p>
            <div className="mt-8">
              {promoActive ? (
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-200">Eenmalige actie</p>
              ) : null}
              <p className={`text-[10px] font-semibold uppercase tracking-wide text-white/60 ${promoActive ? 'mt-2' : ''}`}>
                Jouw tarief
              </p>
              {promoActive ? (
                <>
                  <p className="relative mt-2 inline-block font-serif text-lg text-white/90">
                    <span aria-hidden className="select-none">€{yearlyPrice} / jaar</span>
                    <span
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                      aria-hidden
                    >
                      <span className="absolute h-[3px] w-[108%] rotate-[-14deg] rounded-sm bg-red-500 shadow-sm" />
                      <span className="absolute h-[3px] w-[108%] rotate-[14deg] rounded-sm bg-red-500 shadow-sm" />
                    </span>
                    <span className="sr-only">Normaal €{yearlyPrice} per jaar</span>
                  </p>
                  <p className="mt-2 flex flex-wrap items-baseline gap-2">
                    <span className="font-serif text-4xl font-bold tabular-nums md:text-5xl">€{price}</span>
                    <span className="text-sm text-white/90">éénmalig · premium voor het leven</span>
                  </p>
                </>
              ) : (
                <p className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="font-serif text-4xl font-bold tabular-nums md:text-5xl">€{price}</span>
                  <span className="text-sm text-white/80">per jaar</span>
                </p>
              )}
            </div>
            {checkoutErr ? <p className="mt-4 text-sm text-amber-200">{checkoutErr}</p> : null}
          </div>
          <div className="flex w-full shrink-0 flex-col items-end gap-3 lg:w-auto lg:pt-2">
            {promoActive ? (
              <PremiumPromoCountdown className="text-right" size="md" />
            ) : null}
            {active ? (
              <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-400/40">
                Premium actief
              </span>
            ) : canCheckout ? (
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={onStartCheckout}
                className={MODEL_BTN_GOLD}
              >
                {checkoutBusy ? 'Even geduld…' : 'Premium worden'}
              </button>
            ) : (
              <p className="max-w-xs text-right text-xs text-white/70">
                Online afrekenen is voor dit account niet geactiveerd. Neem contact op met het bureau.
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-burgundy">Waarom betalen?</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700">
            We investeren zwaar in een <strong>moderne site en app</strong>: veilige hosting, onderhoud, nieuwe
            functies en een duidelijke workflow voor jou als model. Jouw bijdrage helpt dat platform betrouwbaar en
            professioneel te houden — en maakt het <strong>merkelijk eenvoudiger</strong> om opdrachten, afspraken en
            documenten te volgen.
          </p>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-burgundy">Wat krijg je?</h2>
          <ul className="mt-3 space-y-2.5 text-sm leading-snug text-zinc-700">
            <li className="flex gap-2">
              <span className="text-burgundy">✓</span>
              <span>
                <strong>Premium toegang</strong> tot alle modelmodules van het portaal (geen backoffice).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-burgundy">✓</span>
              <span>
                <strong>Pushberichten</strong> bij nieuwe opdrachten die bij je profiel passen — sneller reageren.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-burgundy">✓</span>
              <span>Historiek, berichten sturen en volledige opdrachtenflow.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-burgundy">✓</span>
              <span>
                Na geslaagde betaling via <strong>Mollie</strong> is premium <strong>direct actief</strong>.
              </span>
            </li>
          </ul>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-burgundy">Zonder premium</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700">
            Je houdt toegang tot de <strong>basisfuncties</strong> van het portaal. Pushberichten, historiek, berichten
            sturen en meldingen bij passende opdrachten zijn voorbehouden aan premium.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-burgundy/20 bg-burgundy/[0.04] px-5 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">Klaar om te upgraden?</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              {promoActive
                ? `Promotie t/m zaterdag 12:00 — daarna €${yearlyPrice} per jaar.`
                : `Jaarabonnement €${yearlyPrice} per jaar.`}
            </p>
          </div>
          {!active && canCheckout ? (
            <button
              type="button"
              disabled={checkoutBusy}
              onClick={onStartCheckout}
              className={`shrink-0 ${MODEL_BTN_GOLD}`}
            >
              {checkoutBusy ? 'Bezig…' : `Premium worden — €${price}`}
            </button>
          ) : active ? (
            <p className="shrink-0 text-sm font-semibold text-emerald-800">Je zit al op premium — bedankt!</p>
          ) : null}
        </div>
      </section>

      <p className="text-center text-xs text-muted">
        <Link href="/portal/model?tab=profiel" className="text-burgundy underline hover:text-burgundyDeep">
          Terug naar profiel
        </Link>
        {' · '}
        <Link href="/portal/model?tab=home" className="text-burgundy underline hover:text-burgundyDeep">
          Home portaal
        </Link>
      </p>
    </div>
  );
}
