'use client';

import Link from 'next/link';
import type { AuthUser } from '@/context/auth-context';
import { PREMIUM_YEARLY_PRICE } from '@/lib/premium-promo';
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
  const yearlyPrice = premiumInfo?.yearlyPrice ?? String(PREMIUM_YEARLY_PRICE);
  const price = yearlyPrice;
  const active = user.isPremium;
  const until = user.premiumUntil ? new Date(user.premiumUntil).toLocaleDateString('nl-BE') : null;

  return (
    <div className="space-y-8">
      {premiumReturn && active ? (
        <div
          className="rounded-sm px-4 py-3 text-sm"
          style={{
            border: '1px solid rgba(46, 125, 70, 0.35)',
            background: 'rgba(46, 125, 70, 0.12)',
            color: 'var(--n-ink)',
          }}
        >
          <strong>Bedankt!</strong> Je betaling werd verwerkt. Premium staat nu actief op je account
          {until ? ` (geldig t.e.m. ${until}).` : user.premiumUntil === null ? ' (levenslang).' : '.'}
        </div>
      ) : null}
      {premiumReturn && !active ? (
        <div
          className="rounded-sm px-4 py-3 text-sm"
          style={{
            border: '1px solid var(--n-gold-hair)',
            background: 'rgba(212, 175, 106, 0.12)',
            color: 'var(--n-ink)',
          }}
        >
          We verwerken je betaling. Vernieuw zo nodig even deze pagina; na bevestiging door Mollie zie je hier
          &quot;Premium actief&quot;.
        </div>
      ) : null}

      <header
        className="relative overflow-hidden rounded-sm px-4 py-6 lg:px-10 lg:py-10"
        style={{
          background: 'var(--n-gold)',
          border: '1px solid #b8954a',
          color: '#14110a',
        }}
      >
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 max-w-xl">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: '#3d2e14' }}
            >
              Class-Models
            </p>
            <h1
              className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl"
              style={{ color: '#14110a' }}
            >
              Premium <span className="block lg:inline">modelaccount</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed lg:mt-4" style={{ color: '#3a3226' }}>
              Volledige toegang tot je modellenportaal: opdrachten, agenda, portfolio en alle communicatie — met{' '}
              <strong style={{ color: '#14110a' }}>pushberichten</strong> bij nieuwe acties en updates, zodat je
              niets mist.
            </p>
            {checkoutErr ? (
              <p className="mt-4 text-sm font-medium" style={{ color: '#5c1a12' }}>
                {checkoutErr}
              </p>
            ) : null}
          </div>
          <div className="flex w-full shrink-0 flex-col items-stretch gap-3 sm:items-end lg:w-auto lg:pt-2">
            <div className="text-left sm:text-right">
              <p className="flex flex-wrap items-baseline gap-1.5 sm:justify-end lg:gap-2">
                <span
                  className="font-serif text-3xl font-bold tabular-nums lg:text-5xl"
                  style={{ color: '#14110a' }}
                >
                  €{price}
                </span>
                <span className="text-xs lg:text-sm" style={{ color: '#3a3226' }}>
                  per jaar
                </span>
              </p>
            </div>
            {active ? (
              <span
                className="inline-flex justify-center rounded-sm px-4 py-2 text-xs font-bold uppercase tracking-wide"
                style={{
                  background: 'rgba(20, 17, 10, 0.12)',
                  color: '#14110a',
                  border: '1px solid rgba(20, 17, 10, 0.28)',
                }}
              >
                Premium actief
              </span>
            ) : canCheckout ? (
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={onStartCheckout}
                className="inline-flex items-center justify-center rounded-sm px-5 py-3 text-sm font-bold tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: '#14110a',
                  color: '#f6efe2',
                  border: '1px solid #14110a',
                }}
              >
                {checkoutBusy ? 'Even geduld…' : 'Word premium'}
              </button>
            ) : (
              <p className="max-w-xs text-left text-xs sm:text-right" style={{ color: '#3a3226' }}>
                Online afrekenen is voor dit account niet geactiveerd. Neem contact op met het bureau.
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <section
          className="rounded-sm p-5"
          style={{ background: 'var(--n-bg-2)', border: '1px solid var(--n-hair)' }}
        >
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--n-gold)' }}>
            Waarom betalen?
          </h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--n-mut)' }}>
            We investeren zwaar in een <strong style={{ color: 'var(--n-ink)' }}>moderne site en app</strong>: veilige
            hosting, onderhoud, nieuwe functies en een duidelijke workflow voor jou als model. Jouw bijdrage helpt dat
            platform betrouwbaar en professioneel te houden — en maakt het{' '}
            <strong style={{ color: 'var(--n-ink)' }}>merkelijk eenvoudiger</strong> om opdrachten, afspraken en
            documenten te volgen.
          </p>
        </section>
        <section
          className="rounded-sm p-5"
          style={{ background: 'var(--n-bg-2)', border: '1px solid var(--n-hair)' }}
        >
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--n-gold)' }}>
            Wat krijg je?
          </h2>
          <ul className="mt-3 space-y-2.5 text-sm leading-snug" style={{ color: 'var(--n-mut)' }}>
            <li className="flex gap-2">
              <span style={{ color: 'var(--n-gold)' }}>✓</span>
              <span>
                <strong style={{ color: 'var(--n-ink)' }}>Premium toegang</strong> tot alle modelmodules van het portaal
                (geen backoffice).
              </span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: 'var(--n-gold)' }}>✓</span>
              <span>
                <strong style={{ color: 'var(--n-ink)' }}>Pushberichten</strong> bij nieuwe opdrachten die bij je profiel
                passen — sneller reageren.
              </span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: 'var(--n-gold)' }}>✓</span>
              <span>Historiek, berichten sturen en volledige opdrachtenflow.</span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: 'var(--n-gold)' }}>✓</span>
              <span>
                Na geslaagde betaling via <strong style={{ color: 'var(--n-ink)' }}>Mollie</strong> is premium{' '}
                <strong style={{ color: 'var(--n-ink)' }}>direct actief</strong>.
              </span>
            </li>
          </ul>
        </section>
        <section
          className="rounded-sm p-5"
          style={{ background: 'var(--n-bg-2)', border: '1px solid var(--n-hair)' }}
        >
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--n-gold)' }}>
            Zonder premium
          </h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--n-mut)' }}>
            Je houdt toegang tot de <strong style={{ color: 'var(--n-ink)' }}>basisfuncties</strong> van het portaal.
            Pushberichten, historiek, berichten sturen en meldingen bij passende opdrachten zijn voorbehouden aan
            premium.
          </p>
        </section>
      </div>

      <section
        className="rounded-sm px-5 py-6 md:px-8"
        style={{
          background: 'rgba(212, 175, 106, 0.08)',
          border: '1px solid var(--n-gold-hair)',
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--n-ink)' }}>
              Klaar om te upgraden?
            </h2>
            <p className="mt-1 max-w-xl text-sm" style={{ color: 'var(--n-mut)' }}>
              Jaarabonnement €{yearlyPrice} per jaar.
            </p>
          </div>
          {!active && canCheckout ? (
            <button
              type="button"
              disabled={checkoutBusy}
              onClick={onStartCheckout}
              className={`shrink-0 ${MODEL_BTN_GOLD}`}
            >
              {checkoutBusy ? 'Bezig…' : `Word premium — €${price}`}
            </button>
          ) : active ? (
            <p className="shrink-0 text-sm font-semibold" style={{ color: 'var(--n-ink)' }}>
              Je zit al op premium — bedankt!
            </p>
          ) : null}
        </div>
      </section>

      <p className="text-center text-xs" style={{ color: 'var(--n-dim)' }}>
        <Link href="/modellen?tab=profiel" className="nieuw-link">
          Terug naar profiel
        </Link>
        {' · '}
        <Link href="/modellen?tab=home" className="nieuw-link">
          Home portaal
        </Link>
      </p>
    </div>
  );
}
