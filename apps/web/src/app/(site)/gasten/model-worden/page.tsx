import type { Metadata } from 'next';
import { NieuwShell } from '@/components/nieuw/NieuwShell';
import { GuestSignupWizard } from '@/components/guest-portal/GuestSignupWizard';
import {
  GUEST_SIMPLE_FUNNEL,
} from '@/components/guest-portal/guest-portal-data';

export const metadata: Metadata = {
  title: 'Model worden in België',
  description:
    'Geen ervaring nodig — wel uitstraling. Meld je interesse bij Class-Models en plan een vrijblijvende kennismaking in Hulshout.',
  alternates: {
    canonical: '/gasten/model-worden',
  },
};

const F = GUEST_SIMPLE_FUNNEL;

export default function ModelWordenPage() {
  return (
    <NieuwShell portal="gasten">
      {/* Hero — één boodschap, één primaire CTA */}
      <section className="nieuw-sectie" style={{ paddingTop: 28, paddingBottom: 36 }}>
        <div className="nieuw-wrap">
          <div className="nieuw-portal-hero nieuw-portal-hero--banner">
            <div className="nieuw-portal-hero-media" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nieuw/hero-2.jpg"
                alt=""
                loading="eager"
                decoding="async"
                fetchPriority="high"
                style={{ objectPosition: 'left top' }}
              />
            </div>
            <div className="nieuw-portal-hero-copy">
              <span className="nieuw-label">{F.kicker}</span>
              <h1 className="nieuw-portal-hero-title-block" style={{ marginTop: 14 }}>
                {F.headline.map((line, i) => (
                  <span key={line} className={`lijn${i + 1}`}>
                    {line}
                  </span>
                ))}
              </h1>
              <p className="nieuw-lead nieuw-portal-hero-lead-banner">{F.lead}</p>
              <div className="nieuw-hero-actions" style={{ marginTop: 22 }}>
                <a className="nieuw-btn" href="#inschrijven">
                  {F.primaryCta} →
                </a>
                <a className="nieuw-btn nieuw-btn-ghost" href="#hoe-werkt-het">
                  {F.secondaryCta}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Korte belofte-balk */}
      <section style={{ paddingBottom: 40 }}>
        <div className="nieuw-wrap">
          <div
            className="nieuw-panel"
            style={{
              padding: '28px 28px 24px',
              background: 'linear-gradient(135deg, #14110c 0%, #1c1812 100%)',
              borderColor: 'rgba(212,175,106,0.28)',
            }}
          >
            <h2 className="nieuw-display nieuw-display-md" style={{ margin: 0 }}>
              {F.bannerTitle[0]} <em>{F.bannerTitle[1]}</em>
            </h2>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px 18px',
                marginTop: 18,
              }}
            >
              {F.bannerPoints.map((p) => (
                <span
                  key={p}
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--n-gold)',
                  }}
                >
                  ✓ {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Diversiteit — tekst links, foto rechts */}
      <section
        className="nieuw-sectie nieuw-diversity-sectie"
        style={{
          background: 'var(--n-bg-2)',
          borderTop: '1px solid var(--n-hair)',
          borderBottom: '1px solid var(--n-hair)',
        }}
      >
        <div className="nieuw-wrap">
          <div className="nieuw-diversity-grid">
            <div className="nieuw-diversity-copy">
              <span className="nieuw-label">{F.diversityKicker}</span>
              <h2 className="nieuw-display nieuw-display-md nieuw-diversity-title">
                {F.diversityTitle[0]}
                <br />
                <em>{F.diversityTitle[1]}</em>
              </h2>
              {F.diversityBody.map((p) => (
                <p key={p} className="nieuw-lead nieuw-diversity-body">
                  {p}
                </p>
              ))}
            </div>
            <div className="nieuw-diversity-media">
              <div className="nieuw-diversity-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/nieuw/diversity-models.png"
                  alt="Uiteenlopende looks bij Class-Models — jouw persoonlijkheid maakt het verschil"
                  loading="lazy"
                  decoding="async"
                />
                <p className="nieuw-diversity-caption">Jouw persoonlijkheid maakt het verschil.</p>
              </div>
              <div className="nieuw-diversity-badge" aria-hidden="true">
                <span>Een nieuw gezicht?</span>
                <span>Misschien ben jij het.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 stappen — geen 3 parallelle producten */}
      <section id="hoe-werkt-het" className="nieuw-sectie">
        <div className="nieuw-wrap">
          <span className="nieuw-label">{F.stepsKicker}</span>
          <h2 className="nieuw-display nieuw-display-md" style={{ marginTop: 14 }}>
            {F.stepsTitle}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 16,
              marginTop: 28,
            }}
            className="nieuw-simple-steps"
          >
            {F.steps.map((s) => (
              <div key={s.n} className="nieuw-panel" style={{ padding: 22 }}>
                <div
                  style={{
                    fontFamily: 'var(--n-serif)',
                    fontSize: 28,
                    color: 'var(--n-gold)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {s.n}
                </div>
                <h3 className="nieuw-h3" style={{ marginTop: 10, marginBottom: 8 }}>
                  {s.title}
                </h3>
                <p className="nieuw-lead" style={{ margin: 0, fontSize: 14 }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <a className="nieuw-btn" href="#inschrijven">
              Ontdek jouw mogelijkheden →
            </a>
          </div>
        </div>
      </section>

      {/* Kalmerende CTA */}
      <section style={{ paddingBottom: 48 }}>
        <div className="nieuw-wrap">
          <div
            className="nieuw-panel"
            style={{
              padding: '32px 28px',
              textAlign: 'center',
              borderColor: 'rgba(212,175,106,0.22)',
            }}
          >
            <span className="nieuw-label">{F.calmKicker}</span>
            <h2 className="nieuw-display nieuw-display-md" style={{ marginTop: 12 }}>
              {F.calmTitle[0]} <em>{F.calmTitle[1]}</em>
            </h2>
            <p className="nieuw-lead" style={{ margin: '14px auto 0', maxWidth: 52 * 8 }}>
              {F.calmBody}
            </p>
            <a className="nieuw-btn" href="#inschrijven" style={{ marginTop: 22 }}>
              {F.calmCta} →
            </a>
          </div>
        </div>
      </section>

      {/* Enige inschrijf-actie — twee kolommen + stapsgewijze wizard */}
      <section
        id="inschrijven"
        className="nieuw-sectie"
        style={{
          background: 'var(--n-bg-2)',
          borderTop: '1px solid var(--n-hair)',
          borderBottom: '1px solid var(--n-hair)',
        }}
      >
        <div className="nieuw-wrap" style={{ maxWidth: 1100 }}>
          <GuestSignupWizard />
        </div>
      </section>

      <style>{`
        .nieuw-diversity-sectie {
          padding-top: 50px !important;
          padding-bottom: 50px !important;
          overflow: visible;
        }
        .nieuw-diversity-sectie .nieuw-wrap {
          overflow: visible;
        }
        .nieuw-diversity-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          gap: 36px;
          align-items: start;
        }
        .nieuw-diversity-copy {
          text-align: left !important;
          min-width: 0;
          padding-top: 0;
        }
        .nieuw-diversity-copy .nieuw-label,
        .nieuw-diversity-copy .nieuw-display,
        .nieuw-diversity-copy .nieuw-display-md,
        .nieuw-diversity-copy .nieuw-lead {
          text-align: left !important;
          margin-left: 0;
          margin-right: 0;
        }
        .nieuw-diversity-copy .nieuw-label {
          display: block;
          margin-bottom: 0;
        }
        .nieuw-diversity-title {
          margin-top: 22px !important;
          margin-bottom: 0 !important;
        }
        .nieuw-diversity-body {
          margin-top: 22px !important;
          white-space: pre-line;
        }
        .nieuw-diversity-body + .nieuw-diversity-body {
          margin-top: 14px !important;
        }
        .nieuw-diversity-media {
          position: relative;
          min-width: 0;
          overflow: visible;
          padding-top: 14px;
          padding-right: 18px;
        }
        .nieuw-diversity-frame {
          position: relative;
          border: 1px solid rgba(200, 166, 98, 0.85);
          padding: 5px;
          background: #0e0d0d;
          overflow: hidden;
        }
        .nieuw-diversity-frame img {
          display: block;
          width: 100%;
          height: auto;
          aspect-ratio: 3 / 2;
          object-fit: cover;
          object-position: center 18%;
        }
        .nieuw-diversity-caption {
          position: absolute;
          left: 5px;
          right: 5px;
          bottom: 18px;
          margin: 0;
          text-align: center;
          font-family: var(--n-serif);
          font-size: clamp(15px, 1.7vw, 20px);
          font-weight: 500;
          font-style: italic;
          letter-spacing: 0.01em;
          color: #fff;
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.55);
          pointer-events: none;
        }
        .nieuw-diversity-badge {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px 14px;
          background: #0a0908;
          border: 1px solid rgba(200, 166, 98, 0.9);
          color: var(--n-gold);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          line-height: 1.35;
          white-space: nowrap;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .nieuw-diversity-badge span {
          display: block;
        }
        .nieuw-booking-lead-one-line {
          max-width: none !important;
          white-space: nowrap;
        }
        .nieuw-signup-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: 40px;
          align-items: start;
        }
        .nieuw-signup-panel {
          border: 1px solid rgba(200, 166, 98, 0.45);
          background: #0c0b0a;
          padding: 26px 24px 28px;
        }
        .nieuw-signup-step {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--n-gold);
        }
        .nieuw-signup-title {
          margin: 0;
          font-family: var(--n-display);
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--n-ink);
          line-height: 1.15;
        }
        .nieuw-signup-sub {
          margin: 8px 0 18px;
          color: var(--n-mut);
          font-size: 13.5px;
          line-height: 1.55;
        }
        .nieuw-signup-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .nieuw-signup-row .nieuw-signup-label {
          margin-bottom: 14px;
        }
        .nieuw-signup-check {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 2px 0 14px;
          padding: 12px 12px;
          border: 1px solid rgba(200, 166, 98, 0.45);
          background: rgba(212, 175, 106, 0.06);
          color: var(--n-ink);
          font-size: 13px;
          cursor: pointer;
        }
        .nieuw-signup-check input {
          margin-top: 2px;
          flex: none;
          accent-color: var(--n-gold);
        }
        .nieuw-signup-check span {
          display: flex;
          flex-direction: column;
          gap: 3px;
          line-height: 1.4;
        }
        .nieuw-signup-check small {
          color: var(--n-mut);
          font-size: 12px;
        }
        .nieuw-signup-photo {
          position: relative;
          margin: 2px 0 16px;
        }
        .nieuw-signup-photo-head {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          color: var(--n-ink);
        }
        .nieuw-signup-photo-head em {
          font-style: normal;
          font-size: 11.5px;
          letter-spacing: 0.04em;
          text-transform: lowercase;
          color: var(--n-gold);
        }
        .nieuw-signup-photo-input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }
        .nieuw-signup-photo-drop {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          min-height: 132px;
          padding: 22px 16px;
          background:
            linear-gradient(180deg, rgba(212, 175, 106, 0.06), rgba(0, 0, 0, 0.18)),
            #100f0d;
          border: 1px dashed rgba(200, 166, 98, 0.55);
          color: var(--n-ink);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .nieuw-signup-photo-drop:hover {
          border-color: rgba(200, 166, 98, 0.95);
          background:
            linear-gradient(180deg, rgba(212, 175, 106, 0.1), rgba(0, 0, 0, 0.22)),
            #12110e;
        }
        .nieuw-signup-photo-icon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          margin-bottom: 2px;
          border: 1px solid rgba(200, 166, 98, 0.7);
          color: var(--n-gold-2);
          font-size: 22px;
          line-height: 1;
        }
        .nieuw-signup-photo-drop strong {
          font-size: 13.5px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .nieuw-signup-photo-drop small {
          color: var(--n-mut);
          font-size: 12px;
        }
        .nieuw-signup-photo-preview {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          padding: 12px;
          background: #100f0d;
          border: 1px solid rgba(200, 166, 98, 0.45);
        }
        .nieuw-signup-photo-preview img {
          width: 96px;
          height: 96px;
          object-fit: cover;
          border: 1px solid rgba(238, 233, 223, 0.18);
        }
        .nieuw-signup-photo-preview-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .nieuw-signup-photo-preview-meta strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }
        .nieuw-signup-photo-preview-meta > span {
          font-size: 12px;
          color: var(--n-mut);
        }
        .nieuw-signup-photo-preview-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .nieuw-signup-photo-preview-actions .nieuw-btn {
          padding: 7px 10px;
          font-size: 11px;
        }
        .nieuw-signup-input {
          display: block;
          width: 100%;
          margin-top: 7px;
          padding: 11px 12px;
          background: #141210;
          border: 1px solid rgba(238, 233, 223, 0.28);
          color: var(--n-ink);
          font-size: 14px;
          outline: none;
        }
        .nieuw-signup-input:focus {
          border-color: rgba(200, 166, 98, 0.75);
        }
        .nieuw-signup-textarea {
          resize: vertical;
          min-height: 110px;
        }
        .nieuw-signup-choice {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          width: 100%;
          text-align: left;
          margin: 0 0 10px;
          padding: 14px 14px;
          background: transparent;
          border: 1px solid rgba(238, 233, 223, 0.22);
          color: var(--n-ink);
          cursor: pointer;
        }
        .nieuw-signup-choice.is-on {
          border-color: rgba(200, 166, 98, 0.9);
        }
        .nieuw-signup-choice strong {
          display: block;
          font-size: 14.5px;
        }
        .nieuw-signup-choice small {
          display: block;
          margin-top: 4px;
          font-size: 12.5px;
          color: var(--n-mut);
          line-height: 1.4;
        }
        .nieuw-signup-choice.is-on small {
          color: rgba(200, 166, 98, 0.92);
        }
        .nieuw-signup-radio {
          flex: none;
          width: 16px;
          height: 16px;
          margin-top: 3px;
          border-radius: 50%;
          border: 1.5px solid rgba(238, 233, 223, 0.45);
          box-shadow: inset 0 0 0 0 transparent;
        }
        .nieuw-signup-choice.is-on .nieuw-signup-radio {
          border-color: var(--n-gold);
          box-shadow: inset 0 0 0 4px var(--n-gold);
        }
        .nieuw-signup-cta {
          width: 100%;
          margin-top: 18px;
          justify-content: center;
        }
        .nieuw-signup-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 18px;
        }
        .nieuw-signup-actions .nieuw-btn:last-child:not(.nieuw-btn-ghost) {
          margin-left: auto;
        }
        .nieuw-signup-picked {
          margin: 0 0 14px;
          padding: 9px 12px;
          border: 1px solid rgba(200, 166, 98, 0.4);
          background: rgba(212, 175, 106, 0.08);
          color: var(--n-gold-2);
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .nieuw-signup-error {
          margin: 0 0 12px;
          padding: 10px 12px;
          border: 1px solid rgba(200, 120, 90, 0.45);
          background: rgba(120, 40, 20, 0.25);
          color: #f3d7cc;
          font-size: 13px;
        }
        .nieuw-signup-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 0 0 14px;
        }
        .nieuw-signup-panel-head .nieuw-signup-step {
          margin: 0;
        }
        .nieuw-signup-back-top {
          flex: none;
          padding: 6px 10px;
          font-size: 11px;
        }
        .nieuw-signup-day-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          margin: 0 0 4px;
        }
        .nieuw-signup-day-pager {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 2px;
        }
        .nieuw-signup-day-pager-meta {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--n-dim);
          white-space: nowrap;
        }
        .nieuw-signup-day-arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 10px;
          background: transparent;
          border: 1px solid rgba(238, 233, 223, 0.22);
          color: var(--n-ink);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .nieuw-signup-day-arrow:hover:not(:disabled) {
          border-color: rgba(200, 166, 98, 0.85);
          color: var(--n-gold);
        }
        .nieuw-signup-day-arrow:disabled {
          opacity: 0.28;
          cursor: default;
        }
        .nieuw-signup-day-frames {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        .nieuw-signup-day-frame {
          width: 100%;
          border: 1px solid rgba(238, 233, 223, 0.2);
          background: transparent;
        }
        .nieuw-signup-day-frame.is-on {
          border-color: rgba(200, 166, 98, 0.85);
        }
        .nieuw-signup-day-frame.is-past {
          border-color: rgba(180, 70, 70, 0.45);
          opacity: 0.85;
        }
        .nieuw-signup-day-frame.is-past .nieuw-signup-day-toggle {
          cursor: default;
        }
        .nieuw-signup-day-frame.is-past .nieuw-signup-day-toggle strong,
        .nieuw-signup-day-frame.is-past .nieuw-signup-day-range {
          color: #e07070;
        }
        .nieuw-signup-day-frame.is-past .nieuw-signup-radio {
          border-color: rgba(224, 112, 112, 0.65);
        }
        .nieuw-signup-day-toggle:disabled {
          opacity: 1;
        }
        .nieuw-signup-day-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          margin: 0;
          padding: 11px 12px;
          background: transparent;
          border: 0;
          color: var(--n-ink);
          text-align: left;
          cursor: pointer;
        }
        .nieuw-signup-day-toggle strong {
          flex: 1;
          min-width: 0;
          font-size: 13.5px;
          font-weight: 700;
          text-transform: capitalize;
          letter-spacing: 0.01em;
        }
        .nieuw-signup-day-range {
          flex: none;
          margin: 0;
          margin-left: auto;
          max-width: 46%;
          font-size: 11.5px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          text-transform: none;
          color: var(--n-gold);
          text-align: right;
          white-space: normal;
          line-height: 1.25;
        }
        .nieuw-signup-day-frame.is-on .nieuw-signup-day-toggle .nieuw-signup-radio {
          border-color: var(--n-gold);
          box-shadow: inset 0 0 0 4px var(--n-gold);
        }
        .nieuw-signup-day-expand {
          padding: 0 12px 12px 38px;
        }
        .nieuw-signup-day-hours {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          width: 100%;
        }
        .nieuw-signup-hour-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          padding: 5px 7px;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(238, 233, 223, 0.24);
          color: var(--n-ink);
          font-size: 11.5px;
          font-weight: 650;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          cursor: pointer;
        }
        .nieuw-signup-hour-check:hover {
          border-color: rgba(200, 166, 98, 0.7);
          color: var(--n-gold-2);
        }
        .nieuw-signup-hour-check.is-on {
          border-color: var(--n-gold);
          color: var(--n-gold-2);
          background: rgba(212, 175, 106, 0.16);
        }
        @media (max-width: 860px) {
          .nieuw-booking-lead-one-line {
            white-space: normal;
          }
          .nieuw-signup-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .nieuw-signup-row {
            grid-template-columns: 1fr;
            gap: 0;
          }
          .nieuw-signup-day-toggle {
            padding: 10px 11px;
          }
          .nieuw-signup-day-toggle strong {
            font-size: 13px;
          }
          .nieuw-signup-hour-check {
            min-width: 42px;
            padding: 5px 6px;
            font-size: 11px;
          }
          .nieuw-diversity-sectie {
            padding-top: 36px !important;
            padding-bottom: 36px !important;
          }
          .nieuw-simple-steps {
            grid-template-columns: 1fr !important;
          }
          .nieuw-diversity-grid {
            grid-template-columns: 1fr;
            gap: 22px;
          }
          .nieuw-diversity-media {
            padding-top: 12px;
            padding-right: 14px;
          }
          .nieuw-diversity-frame img {
            aspect-ratio: 4 / 3;
          }
          .nieuw-diversity-badge {
            font-size: 9px;
            padding: 8px 11px;
            letter-spacing: 0.1em;
          }
          .nieuw-diversity-caption {
            bottom: 14px;
            font-size: 15px;
          }
        }
      `}</style>
    </NieuwShell>
  );
}
