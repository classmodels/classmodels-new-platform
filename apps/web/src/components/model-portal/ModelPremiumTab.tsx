'use client';

import Link from 'next/link';
import type { AuthUser } from '@/context/auth-context';

/** Adviesprijs voor marketing (niet uit Mollie). */
const PREMIUM_REFERENCE_PRICE = 99;

type PremiumInfo = { currency: string; amount: string; premiumDurationDays: number };

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
  const price = premiumInfo?.amount ?? '48';
  const days = premiumInfo?.premiumDurationDays ?? 365;
  const active = user.isPremium;
  const until = user.premiumUntil ? new Date(user.premiumUntil).toLocaleDateString('nl-BE') : null;

  return (
    <div className="space-y-8">
      {premiumReturn && active ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <strong>Bedankt!</strong> Je betaling werd verwerkt. Premium staat nu actief op je account
          {until ? ` (geldig t.e.m. ${until}).` : '.'}
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
        <div className="relative max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Class Models</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">Premium modelaccount</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/90">
            Volledige toegang tot je modellenportaal: opdrachten, agenda, portfolio en alle communicatie — met{' '}
            <strong className="text-white">pushberichten</strong> bij nieuwe acties en updates, zodat je niets mist.
          </p>
          <div className="mt-8 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Jouw tarief</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="font-serif text-4xl font-bold tabular-nums md:text-5xl">€{price}</span>
                <span className="text-sm text-white/80">eenmalig · {days} dagen premium</span>
              </p>
              <p className="mt-1 text-xs text-white/60">
                <span className="line-through decoration-white/40">€{PREMIUM_REFERENCE_PRICE}</span> adviesprijs — jij
                profiteert van introductievoorwaarden.
              </p>
            </div>
            {active ? (
              <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-400/40">
                Premium actief
              </span>
            ) : canCheckout ? (
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={onStartCheckout}
                className="rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-burgundy shadow-lg transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {checkoutBusy ? 'Even geduld…' : 'Afrekenen met Mollie'}
              </button>
            ) : (
              <p className="max-w-xs text-xs text-white/70">
                Online afrekenen is voor dit account niet geactiveerd. Neem contact op met het bureau.
              </p>
            )}
          </div>
          {checkoutErr ? <p className="relative mt-4 max-w-xl text-sm text-amber-200">{checkoutErr}</p> : null}
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
                <strong>Pushberichten</strong> bij relevante acties en updates — sneller dan enkel e-mail.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-burgundy">✓</span>
              <span>Volledige opdrachtenflow, historiek en instellingen zoals voorzien op je account.</span>
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
            Je houdt toegang tot de <strong>basisfuncties</strong> van het portaal. Pushberichten en een aantal
            uitgebreide onderdelen zijn voorbehouden aan premium — ideaal als je later volledig mee wilt in tempo van
            het bureau.
          </p>
          <p className="mt-4 text-xs text-muted">
            Vragen over factuur of duur? Mail het bureau via het tabblad &quot;Bericht sturen&quot;.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-burgundy/20 bg-burgundy/[0.04] px-5 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">Klaar om te upgraden?</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Je wordt doorgestuurd naar Mollie voor een veilige betaling. Daarna keren we terug naar dit scherm —
              premium staat dan zo snel mogelijk actief.
            </p>
          </div>
          {!active && canCheckout ? (
            <button
              type="button"
              disabled={checkoutBusy}
              onClick={onStartCheckout}
              className="shrink-0 rounded-full bg-burgundy px-8 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md hover:bg-burgundyDeep disabled:opacity-50"
            >
              {checkoutBusy ? 'Bezig…' : `Premium — €${price}`}
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
        <Link href="/portal/model" className="text-burgundy underline hover:text-burgundyDeep">
          Home portaal
        </Link>
      </p>
    </div>
  );
}
