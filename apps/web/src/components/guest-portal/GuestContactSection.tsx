'use client';

import Link from 'next/link';
import type { FormEvent, ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { GUEST_CONTACT_INFO } from '@/components/guest-portal/guest-portal-data';

function ContactTile({
  kicker,
  children,
}: {
  kicker: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-cm border border-burgundy/15 bg-gradient-to-br from-white to-burgundy/[0.04] px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-burgundy">{kicker}</p>
      <div className="mt-1.5 text-sm font-medium leading-snug text-ink">{children}</div>
    </div>
  );
}

export function GuestContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  const submitMailto = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setHint(null);
      if (!message.trim()) {
        setHint('Schrijf kort je vraag of bericht.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setHint('Vul een geldig e-mailadres in zodat we je kunnen antwoorden.');
        return;
      }
      const subject = encodeURIComponent(`Bericht via gastenportaal — ${name.trim() || 'Bezoeker'}`);
      const body = encodeURIComponent(
        `${message.trim()}\n\n—\nNaam: ${name.trim() || '—'}\nE-mail: ${email.trim()}`,
      );
      const mailto = `mailto:${GUEST_CONTACT_INFO.email}?subject=${subject}&body=${body}`;
      setHint('Je e-mailprogramma opent zodat je het bericht naar ons kan versturen.');
      window.location.href = mailto;
    },
    [name, email, message],
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-cm border border-burgundy/20 bg-gradient-to-br from-burgundy/[0.12] via-burgundy/[0.05] to-white px-5 py-6 shadow-[0_0_28px_-12px_rgba(111,18,27,0.35)] md:px-7 md:py-7">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-burgundy/10 blur-2xl"
          aria-hidden
        />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-burgundy">Contact</p>
        <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-burgundy md:text-3xl">
          {GUEST_CONTACT_INFO.company}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/85">
          Vragen over model worden, castings of samenwerking? Bel, mail of stuur een bericht. We reageren zo snel
          mogelijk.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="space-y-3">
          <ContactTile kicker="Adres">
            <span className="font-serif">
              {GUEST_CONTACT_INFO.street}
              <br />
              {GUEST_CONTACT_INFO.cityLine}
            </span>
          </ContactTile>
          <ContactTile kicker="E-mail">
            <a
              href={`mailto:${GUEST_CONTACT_INFO.email}`}
              className="text-burgundy underline decoration-burgundy/40 underline-offset-2 hover:decoration-burgundy"
            >
              {GUEST_CONTACT_INFO.email}
            </a>
          </ContactTile>
          <ContactTile kicker="Telefoon">
            <a
              href={`tel:${GUEST_CONTACT_INFO.phoneTel}`}
              className="text-burgundy underline decoration-burgundy/40 underline-offset-2 hover:decoration-burgundy"
            >
              Gsm {GUEST_CONTACT_INFO.phoneDisplay}
            </a>
          </ContactTile>
          <ContactTile kicker="Rekeningnummer">
            <span className="font-mono text-[13px]">
              {GUEST_CONTACT_INFO.bankLabel} · {GUEST_CONTACT_INFO.iban}
            </span>
          </ContactTile>
          <ContactTile kicker="BTW">
            <span className="font-mono text-[13px]">{GUEST_CONTACT_INFO.vat}</span>
          </ContactTile>
        </div>

        <div className="rounded-cm border border-line bg-white p-4 shadow-sm md:p-5">
          <h3 className="font-serif text-lg font-semibold text-ink">Stuur een bericht</h3>
          <p className="mt-1 text-xs text-muted">
            Je bericht wordt klaargezet in je e-mailapp aan <strong>{GUEST_CONTACT_INFO.email}</strong>.
          </p>
          <form className="mt-4 space-y-3" onSubmit={submitMailto} noValidate>
            <div>
              <label htmlFor="gc-name" className="block text-xs font-semibold text-ink">
                Naam <span className="font-normal text-muted">(optioneel)</span>
              </label>
              <input
                id="gc-name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                className="mt-1 w-full rounded-cm border border-line bg-panel px-3 py-2 text-sm text-ink outline-none ring-burgundy/30 transition focus:border-burgundy/40 focus:ring-2"
                placeholder="Jouw naam"
              />
            </div>
            <div>
              <label htmlFor="gc-email" className="block text-xs font-semibold text-ink">
                E-mail <span className="text-burgundy">*</span>
              </label>
              <input
                id="gc-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="mt-1 w-full rounded-cm border border-line bg-panel px-3 py-2 text-sm text-ink outline-none ring-burgundy/30 transition focus:border-burgundy/40 focus:ring-2"
                placeholder="jij@voorbeeld.be"
              />
            </div>
            <div>
              <label htmlFor="gc-msg" className="block text-xs font-semibold text-ink">
                Bericht <span className="text-burgundy">*</span>
              </label>
              <textarea
                id="gc-msg"
                name="message"
                required
                rows={5}
                value={message}
                onChange={(ev) => setMessage(ev.target.value)}
                className="mt-1 w-full resize-y rounded-cm border border-line bg-panel px-3 py-2 text-sm text-ink outline-none ring-burgundy/30 transition focus:border-burgundy/40 focus:ring-2"
                placeholder="Waar kunnen we je mee helpen?"
              />
            </div>
            {hint ? <p className="text-xs text-burgundy">{hint}</p> : null}
            <button
              type="submit"
              className="w-full rounded-cm bg-burgundy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-burgundyDeep md:w-auto md:px-8"
            >
              Open e-mail en verstuur
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-cm border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel/80 px-3 py-2 md:px-4">
          <p className="text-xs font-semibold text-ink">Locatie</p>
          <a
            href={GUEST_CONTACT_INFO.mapsOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-burgundy underline underline-offset-2 hover:text-burgundyDeep"
          >
            Open in Google Maps
          </a>
        </div>
        <iframe
          title="Class-Models op de kaart"
          src={GUEST_CONTACT_INFO.mapsEmbedUrl}
          className="h-56 w-full border-0 md:h-72"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <p className="text-center text-xs text-muted">
        Terug naar de{' '}
        <Link href="/" className="font-medium text-burgundy underline underline-offset-2 hover:text-burgundyDeep">
          beginpagina
        </Link>{' '}
        om in te loggen of een account te openen.
      </p>
    </div>
  );
}
