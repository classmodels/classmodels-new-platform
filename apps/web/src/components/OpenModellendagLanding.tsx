'use client';

import { useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch, parseApiErrorBody } from '@/lib/api';
import {
  OPEN_MODELLENDAG_BUTTON_LABEL,
  OPEN_MODELLENDAG_DATE_LABEL,
  OPEN_MODELLENDAG_POSTER,
  OPEN_MODELLENDAG_SLOTS,
  OPEN_MODELLENDAG_VENUE,
} from '@/lib/open-modellendag';
import '@/components/nieuw/nieuw.css';
import '@/components/open-modellendag.css';

type Props = {
  /** Volledig scherm (mobiel start) of sectie op desktop-home. */
  variant?: 'page' | 'section';
  showSiteLink?: boolean;
};

export function OpenModellendagLanding({ variant = 'section', showSiteLink = true }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [timeSlot, setTimeSlot] = useState<(typeof OPEN_MODELLENDAG_SLOTS)[number] | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ timeSlot: string; ageGroup: string } | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!timeSlot) {
      setError('Kies een startuur.');
      return;
    }
    const ageNum = Number(age);
    if (!Number.isFinite(ageNum) || ageNum < 6 || ageNum > 99) {
      setError('Vul een geldige leeftijd in (vanaf 6 jaar).');
      return;
    }
    start(async () => {
      try {
        const res = await apiFetch<{ ok: boolean; timeSlot: string; ageGroup: string }>(
          '/open-modellendag/register',
          {
            method: 'POST',
            body: JSON.stringify({
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim(),
              age: ageNum,
              timeSlot,
            }),
          },
        );
        setDone({ timeSlot: res.timeSlot, ageGroup: res.ageGroup });
      } catch (err) {
        const raw = err instanceof Error ? err.message : '';
        const msg = raw ? parseApiErrorBody(raw) : 'Inschrijven lukte niet.';
        setError(msg || 'Inschrijven lukte niet. Probeer opnieuw.');
      }
    });
  }

  const rootClass =
    variant === 'page'
      ? 'nieuw-root nieuw-root--app-mobile-page omd-root'
      : 'omd-root';

  return (
    <div className={rootClass}>
      <section className="omd-hero" aria-labelledby="omd-title">
        <div className="omd-wrap">
          <div className="omd-grid">
            <figure className="omd-poster">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={OPEN_MODELLENDAG_POSTER}
                alt={`${OPEN_MODELLENDAG_BUTTON_LABEL} Class-Models`}
                width={1024}
                height={1536}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </figure>

            <div className="omd-copy">
              <p className="omd-kicker">Class-Models · {OPEN_MODELLENDAG_DATE_LABEL}</p>
              <h1 id="omd-title" className="omd-title">
                Open Modellendag
              </h1>
              <p className="omd-sub">
                Kom kijken · doe mee als je wilt · <em>zonder verplichtingen</em>
              </p>
              <p className="omd-lead">
                Die zondag mag je gewoon <strong>komen kijken</strong> hoe een
                modellenbureau werkt — en optioneel meedoen met een{' '}
                <strong>gratis initiatieles catwalk</strong>.
              </p>
              <p className="omd-text">
                Het is geen examen en geen casting onder druk. We laten zien hoe we werken,
                welke modellen we zoeken, hoe opdrachten verlopen, en je mag al je vragen
                stellen. Wil je meedoen met de les? Super. Wil je vooral observeren? Dat mag
                ook.
              </p>
              <p className="omd-text">
                Je staat niet tussen ervaren modellen: iedereen in jouw groepje doet dit voor
                het eerst of bijna voor het eerst. Kleine groepen (max. 6), opgedeeld op
                leeftijd. Geen ervaring nodig — ook met een maatje meer ben je welkom.
              </p>
              <ul className="omd-bullets">
                <li>
                  <strong>Initiatieles</strong> (1 uur) — wandelen, draaien, passeren — als
                  jij dat wilt
                </li>
                <li>Leeftijdsgroepen: 6–12 · 13–17 · 18–45 · 45–60+</li>
                <li>
                  {OPEN_MODELLENDAG_DATE_LABEL} · starturen 11.00 · 13.00 · 15.00 · 17.00
                </li>
                <li>{OPEN_MODELLENDAG_VENUE}</li>
              </ul>

              <div id="inschrijven" className="omd-form-card">
                {done ? (
                  <div className="omd-success" role="status">
                    <h2>Je bent ingeschreven</h2>
                    <p>
                      Tot <strong>{OPEN_MODELLENDAG_DATE_LABEL}</strong> om{' '}
                      <strong>{done.timeSlot}</strong> (groep {done.ageGroup}).
                    </p>
                    <p>
                      Check je mail — en weet: je mag kijken, meedoen of allebei. Niks moet.
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="omd-form-title">Gratis inschrijven</h2>
                    <p className="omd-form-hint">
                      Kies je startuur. Je komt kijken en mag meedoen met de initiatieles.
                    </p>
                    <form onSubmit={onSubmit} className="omd-form">
                      <label className="omd-field">
                        <span>Naam</span>
                        <input
                          name="name"
                          required
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Voor- en achternaam"
                        />
                      </label>
                      <label className="omd-field">
                        <span>E-mail</span>
                        <input
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          inputMode="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="je@email.com"
                        />
                      </label>
                      <label className="omd-field">
                        <span>Telefoon</span>
                        <input
                          name="phone"
                          type="tel"
                          required
                          autoComplete="tel"
                          inputMode="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0470 00 00 00"
                        />
                      </label>
                      <label className="omd-field">
                        <span>Leeftijd</span>
                        <input
                          name="age"
                          type="number"
                          required
                          min={6}
                          max={99}
                          inputMode="numeric"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="bv. 28"
                        />
                      </label>
                      <fieldset className="omd-slots">
                        <legend>Startuur</legend>
                        <div className="omd-slot-grid">
                          {OPEN_MODELLENDAG_SLOTS.map((slot) => (
                            <label
                              key={slot}
                              className={`omd-slot ${timeSlot === slot ? 'is-on' : ''}`}
                            >
                              <input
                                type="radio"
                                name="timeSlot"
                                value={slot}
                                checked={timeSlot === slot}
                                onChange={() => setTimeSlot(slot)}
                              />
                              <span>{slot.replace(':', '.')} u</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      {error ? <p className="omd-error">{error}</p> : null}
                      <button type="submit" className="omd-submit" disabled={pending}>
                        {pending ? 'Even geduld…' : 'Inschrijven'}
                      </button>
                      <p className="omd-fine">Gratis · zonder verplichtingen · bevestiging per mail</p>
                    </form>
                  </>
                )}
              </div>

              {showSiteLink ? (
                <div className="omd-site-actions">
                  <Link href="/?skipOmd=1" className="omd-site-btn">
                    Naar de Class-Models website
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
