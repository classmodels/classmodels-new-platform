'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { PremiumUpsellBanner } from '@/components/model-portal/PremiumUpsellBanner';

export type OpenBrief = {
  id: string;
  title: string;
  body: string;
  extraInfo?: string | null;
  eventDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  wantedMen?: number | null;
  wantedWomen?: number | null;
  wantedChildren?: number | null;
  wantedTeenagers?: number | null;
  ageManFrom?: number | null;
  ageManTo?: number | null;
  ageWomanFrom?: number | null;
  ageWomanTo?: number | null;
  ageChildFrom?: number | null;
  ageChildTo?: number | null;
  ageTeenFrom?: number | null;
  ageTeenTo?: number | null;
  details?: Record<string, unknown> | null;
  portalDisplay?: { hideGezochtCriteria?: boolean };
  status: string;
  createdAt: string;
  eligibility?: { eligible: boolean; reason: string };
  client: {
    id: string;
    email: string;
    companyName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  responses: { modelUserId: string; status: string }[];
};

type BriefFilter = 'all' | 'eligible' | 'available' | 'subscribed';

function formatBriefSubtitle(b: OpenBrief): string {
  if (!b.eventDate) return '';
  const d = new Date(b.eventDate);
  const dateStr = new Intl.DateTimeFormat('nl-BE', {
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const st = b.startTime?.trim() || '';
  const en = b.endTime?.trim() || '';
  if (st && en) return `${dateStr} · ${st} – ${en}`;
  if (st) return `${dateStr} · ${st}`;
  return dateStr;
}

function ageSuffix(from?: number | null, to?: number | null): string {
  if (from == null && to == null) return '';
  return ` (${from ?? '—'}–${to ?? '—'} jaar)`;
}

function gezochtLines(b: OpenBrief): string[] {
  if (b.portalDisplay?.hideGezochtCriteria) {
    return [
      'Criteria worden niet publiek getoond. Zie de omschrijving of neem contact met Class-Models.',
    ];
  }
  const lines: string[] = [];
  const wm = b.wantedMen ?? 0;
  const ww = b.wantedWomen ?? 0;
  const wk = b.wantedChildren ?? 0;
  const wt = b.wantedTeenagers ?? 0;
  if (wm > 0) lines.push(`Mannen: ${wm}${ageSuffix(b.ageManFrom, b.ageManTo)}`);
  if (ww > 0) lines.push(`Vrouwen: ${ww}${ageSuffix(b.ageWomanFrom, b.ageWomanTo)}`);
  if (wk > 0) lines.push(`Kinderen: ${wk}${ageSuffix(b.ageChildFrom, b.ageChildTo)}`);
  if (wt > 0) lines.push(`Tieners: ${wt}${ageSuffix(b.ageTeenFrom, b.ageTeenTo)}`);
  if (!lines.length) return ['Geen specifieke profielen — iedereen komt in aanmerking.'];
  return lines;
}

function responseMeta(mine: { status: string } | undefined): {
  label: string;
  tone: 'open' | 'submitted' | 'accepted' | 'declined' | 'withdrawn' | 'other';
} {
  if (!mine) return { label: 'Open', tone: 'open' };
  switch (mine.status) {
    case 'declined':
      return { label: 'Niet in aanmerking', tone: 'declined' };
    case 'accepted':
      return { label: 'Geselecteerd', tone: 'accepted' };
    case 'submitted':
      return { label: 'Ingeschreven', tone: 'submitted' };
    case 'withdrawn':
      return { label: 'Uitgeschreven', tone: 'withdrawn' };
    default:
      return { label: 'Onbekend', tone: 'other' };
  }
}

function fmtAddr(a: Record<string, string>): string {
  const line1 = [a.organization, a.street, a.number].filter(Boolean).join(' ');
  const line2 = [a.postcode, a.municipality].filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join('\n');
}

/** Korte plaatsregel voor de kaart (geen klantnaam). */
function placeSummary(details: OpenBrief['details']): string {
  const det = detailRecord(details);
  const onA = asAddr(det.onLocationAddress);
  const mainA = asAddr(det.mainAddress);
  const pick = (a: Record<string, string>) => {
    const street = [a.street, a.number].filter(Boolean).join(' ');
    const city = [a.postcode, a.municipality].filter(Boolean).join(' ');
    if (street && a.municipality) return `${street}, ${a.municipality}`;
    if (city) return city;
    if (street) return street;
    if (a.organization) return a.organization;
    return '';
  };
  return pick(onA) || pick(mainA) || 'Plaats nog niet bekend';
}

function detailRecord(details: OpenBrief['details']): Record<string, unknown> {
  if (details && typeof details === 'object' && !Array.isArray(details)) return details;
  return {};
}

function asAddr(value: unknown): Record<string, string> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, string>;
  }
  return {};
}

export function ModelOpdrachtenTab({
  token,
  modelUserId,
  canRespond,
  isPremium,
  forceEligible = false,
  premiumHref = '/modellen?tab=premium',
}: {
  token: string | null;
  modelUserId: string;
  canRespond: boolean;
  isPremium: boolean;
  /** Admin: behandel alle open opdrachten als match. */
  forceEligible?: boolean;
  premiumHref?: string;
}) {
  const [briefs, setBriefs] = useState<OpenBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefNote, setBriefNote] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [briefErr, setBriefErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [briefFilter, setBriefFilter] = useState<BriefFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadBriefs = useCallback(() => {
    if (!token) {
      setBriefs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch<OpenBrief[]>('/portal/model/briefs', { token })
      .then((rows) => {
        setBriefs(rows);
        setExpandedId((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev;
          const firstMatch = rows.find((r) => r.eligibility?.eligible && r.status === 'open');
          return firstMatch?.id ?? rows[0]?.id ?? null;
        });
      })
      .catch(() => setBriefs([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  const counts = useMemo(() => {
    const eligible = briefs.filter(
      (b) => forceEligible || b.eligibility?.eligible,
    );
    const available = briefs.filter((b) => !b.responses.some((r) => r.modelUserId === modelUserId));
    const subscribed = briefs.filter((b) => b.responses.some((r) => r.modelUserId === modelUserId));
    return {
      all: briefs.length,
      eligible: eligible.length,
      available: available.length,
      subscribed: subscribed.length,
    };
  }, [briefs, modelUserId, forceEligible]);

  const filtered = useMemo(() => {
    if (briefFilter === 'all') return briefs;
    if (briefFilter === 'eligible') {
      return briefs.filter((b) => forceEligible || b.eligibility?.eligible);
    }
    if (briefFilter === 'available') {
      return briefs.filter((b) => !b.responses.some((r) => r.modelUserId === modelUserId));
    }
    return briefs.filter((b) => b.responses.some((r) => r.modelUserId === modelUserId));
  }, [briefs, briefFilter, modelUserId, forceEligible]);

  const submitInterest = async (briefId: string) => {
    if (!token) return;
    setBriefErr(null);
    setOkMsg(null);
    const message = briefNote[briefId]?.trim() || '';
    setBusyId(briefId);
    try {
      await apiFetch(`/portal/model/briefs/${briefId}/responses`, {
        method: 'POST',
        token,
        body: JSON.stringify({ message }),
      });
      setBriefNote((n) => ({ ...n, [briefId]: '' }));
      setOkMsg('Inschrijving verzonden.');
      loadBriefs();
    } catch (e) {
      setBriefErr(e instanceof Error ? e.message : 'Versturen mislukt');
    } finally {
      setBusyId(null);
    }
  };

  const withdrawInterest = async (briefId: string) => {
    if (!token) return;
    setBriefErr(null);
    setOkMsg(null);
    setBusyId(briefId);
    try {
      await apiFetch(`/portal/model/briefs/${briefId}/responses/withdraw`, {
        method: 'POST',
        token,
      });
      setOkMsg('Uitschrijving doorgevoerd.');
      loadBriefs();
    } catch (e) {
      setBriefErr(e instanceof Error ? e.message : 'Uitschrijven mislukt');
    } finally {
      setBusyId(null);
    }
  };

  const filters: { id: BriefFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Alle', count: counts.all },
    { id: 'eligible', label: 'In aanmerking', count: counts.eligible },
    { id: 'available', label: 'Nog open', count: counts.available },
    { id: 'subscribed', label: 'Mijn inschrijvingen', count: counts.subscribed },
  ];

  return (
    <div className="nieuw-opdrachten">
      <header className="nieuw-opdrachten-head">
        <div className="nieuw-opdrachten-hero-copy">
          <span className="nieuw-label">Modellenportaal</span>
          <h2 className="nieuw-opdrachten-display">
            <span>Openstaande</span>
            <em>Opdrachten</em>
          </h2>
          <p className="nieuw-lead nieuw-opdrachten-lead">
            Opdrachten staan op datum gesorteerd. Vul uw modellenfiche aan (geboortedatum als JJJJ-MM-DD en
            geslacht) voor een correcte match. Extra info bij inschrijven is optioneel.
          </p>
        </div>

        <div className="nieuw-opdrachten-side">
          <div className="nieuw-opdrachten-stats" aria-label="Samenvatting">
            <div>
              <strong>{counts.all}</strong>
              <span>open</span>
            </div>
            <div>
              <strong>{counts.eligible}</strong>
              <span>match</span>
            </div>
            <div>
              <strong>{counts.subscribed}</strong>
              <span>inschrijvingen</span>
            </div>
          </div>

          <div className="nieuw-opdrachten-filters" role="tablist" aria-label="Filter opdrachten">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={briefFilter === f.id}
                className={`nieuw-opdrachten-filter${briefFilter === f.id ? ' is-active' : ''}`}
                onClick={() => setBriefFilter(f.id)}
              >
                <span className="nieuw-opdrachten-filter-mark" aria-hidden>
                  ✓
                </span>
                <span className="nieuw-opdrachten-filter-label">
                  <strong>{f.label}:</strong> {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {!isPremium ? (
        <div className="nieuw-opdrachten-upsell">
          <PremiumUpsellBanner premiumHref={premiumHref}>
            Met premium krijgt u <strong>pushmeldingen</strong> zodra er een opdracht binnenkomt die bij uw
            profiel past, plus historiek en berichten — zo mist u geen kans.
          </PremiumUpsellBanner>
        </div>
      ) : null}

      {briefErr ? (
        <p className="nieuw-opdrachten-alert is-error" role="alert">
          {briefErr}
        </p>
      ) : null}
      {okMsg ? (
        <p className="nieuw-opdrachten-alert is-ok" role="status">
          {okMsg}
        </p>
      ) : null}

      {loading ? (
        <div className="nieuw-panel nieuw-opdrachten-empty">
          <p className="nieuw-lead" style={{ margin: 0 }}>
            Opdrachten laden…
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="nieuw-panel nieuw-opdrachten-empty">
          <span className="nieuw-label">Geen resultaten</span>
          <p className="nieuw-lead" style={{ marginTop: 12 }}>
            {briefs.length === 0
              ? 'Er zijn momenteel geen openstaande opdrachten. Controleer later opnieuw of houd uw profiel up-to-date.'
              : 'Geen opdrachten in deze weergave. Kies een andere filter hierboven.'}
          </p>
          {briefs.length > 0 && briefFilter !== 'all' ? (
            <button type="button" className="nieuw-btn nieuw-btn-ghost" style={{ marginTop: 20 }} onClick={() => setBriefFilter('all')}>
              Toon alle opdrachten
            </button>
          ) : null}
          <p className="nieuw-lead" style={{ marginTop: 18, fontSize: 12 }}>
            Tip: een deel van de opdrachten wordt rechtstreeks toegewezen en verschijnt niet altijd als open
            casting.
          </p>
        </div>
      ) : (
        <ul className="nieuw-opdrachten-list">
          {filtered.map((b) => {
            const mine = b.responses.find((r) => r.modelUserId === modelUserId);
            const badge = responseMeta(mine);
            const place = placeSummary(b.details);
            const sub = formatBriefSubtitle(b);
            const inAanmerking = forceEligible || b.eligibility?.eligible === true;
            const canApply =
              canRespond &&
              b.status === 'open' &&
              inAanmerking &&
              (!mine || mine.status === 'withdrawn');
            const blocked = mine?.status === 'declined';
            const det = detailRecord(b.details);
            const mainA = asAddr(det.mainAddress);
            const onA = asAddr(det.onLocationAddress);
            const mainAddr = fmtAddr(mainA);
            const onAddr = fmtAddr(onA);
            const open = expandedId === b.id;
            const lines = gezochtLines(b);

            return (
              <li key={b.id} className={`nieuw-opdracht-card tone-${badge.tone}${inAanmerking ? ' is-match' : ''}`}>
                <button
                  type="button"
                  className="nieuw-opdracht-summary"
                  aria-expanded={open}
                  onClick={() => setExpandedId((id) => (id === b.id ? null : b.id))}
                >
                  <div className="nieuw-opdracht-summary-main">
                    <div className="nieuw-opdracht-meta-row">
                      <time className="nieuw-opdracht-date">{sub || 'Datum volgt'}</time>
                      <span className={`nieuw-opdracht-badge tone-${badge.tone}`}>{badge.label}</span>
                    </div>
                    <h3 className="nieuw-opdracht-title">{b.title}</h3>
                    <p className="nieuw-opdracht-place">{place}</p>
                  </div>
                  <div className="nieuw-opdracht-summary-side">
                    <span className={`nieuw-opdracht-elig ${inAanmerking ? 'is-yes' : 'is-no'}`}>
                      {inAanmerking ? 'In aanmerking' : 'Geen match'}
                    </span>
                    <span className={`nieuw-opdracht-meer${open ? ' is-open' : ''}`}>
                      {open ? 'Sluiten' : 'Meer info'}
                    </span>
                  </div>
                </button>

                {open ? (
                  <div className="nieuw-opdracht-body">
                    <div
                      className={`nieuw-opdracht-elig-banner ${inAanmerking ? 'is-yes' : 'is-no'}`}
                    >
                      {inAanmerking
                        ? 'U komt in aanmerking voor deze opdracht.'
                        : 'U komt niet in aanmerking voor deze opdracht.'}
                      {b.eligibility?.reason ? (
                        <span className="nieuw-opdracht-elig-reason">{b.eligibility.reason}</span>
                      ) : null}
                    </div>

                    <div className="nieuw-opdracht-grid">
                      <section>
                        <span className="nieuw-label">Omschrijving</span>
                        {b.body?.trim() ? (
                          <p className="nieuw-opdracht-text">{b.body}</p>
                        ) : (
                          <p className="nieuw-opdracht-text is-muted">
                            Omschrijving niet zichtbaar voor dit profiel.
                          </p>
                        )}
                        {b.extraInfo?.trim() ? (
                          <p className="nieuw-opdracht-text is-extra">{b.extraInfo}</p>
                        ) : null}
                      </section>

                      <section>
                        <span className="nieuw-label">Gezocht</span>
                        <ul className="nieuw-opdracht-criteria">
                          {lines.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>

                        <dl className="nieuw-opdracht-facts">
                          {typeof det.makeup === 'string' && det.makeup ? (
                            <>
                              <dt>Make-up</dt>
                              <dd>
                                {det.makeup === 'self'
                                  ? 'zelf te doen'
                                  : det.makeup === 'provided'
                                    ? 'make-up aanwezig'
                                    : det.makeup}
                              </dd>
                            </>
                          ) : null}
                          {typeof det.hair === 'string' && det.hair ? (
                            <>
                              <dt>Kapsel</dt>
                              <dd>
                                {det.hair === 'self'
                                  ? 'zelf te doen'
                                  : det.hair === 'provided'
                                    ? 'kapper aanwezig'
                                    : det.hair}
                              </dd>
                            </>
                          ) : null}
                          {typeof det.earningsText === 'string' && det.earningsText ? (
                            <>
                              <dt>Verdiensten</dt>
                              <dd>{det.earningsText}</dd>
                            </>
                          ) : null}
                          {typeof det.provisionsText === 'string' && det.provisionsText ? (
                            <>
                              <dt>Te voorzien</dt>
                              <dd className="is-pre">{det.provisionsText}</dd>
                            </>
                          ) : null}
                          {typeof det.remarksText === 'string' && det.remarksText ? (
                            <>
                              <dt>Opmerkingen</dt>
                              <dd className="is-pre">{det.remarksText}</dd>
                            </>
                          ) : null}
                          {mainAddr.trim() ? (
                            <>
                              <dt>Adres</dt>
                              <dd className="is-pre">{mainAddr}</dd>
                            </>
                          ) : null}
                          {onAddr.trim() ? (
                            <>
                              <dt>Locatie opdracht</dt>
                              <dd className="is-pre">{onAddr}</dd>
                            </>
                          ) : null}
                        </dl>
                      </section>
                    </div>

                    <div className="nieuw-opdracht-actions">
                      {blocked ? (
                        <p className="nieuw-opdracht-status-msg">
                          U bent niet gekozen voor deze opdracht.
                        </p>
                      ) : mine?.status === 'submitted' ? (
                        <div className="nieuw-opdracht-action-row">
                          <p className="nieuw-opdracht-status-msg">
                            Status: <strong className="is-ingeschreven">Ingeschreven</strong>. U kunt zich nog
                            uitschrijven zolang de selectie open is.
                          </p>
                          <button
                            type="button"
                            className="nieuw-btn nieuw-btn-ghost"
                            disabled={busyId === b.id}
                            onClick={() => void withdrawInterest(b.id)}
                          >
                            {busyId === b.id ? 'Bezig…' : 'Uitschrijven'}
                          </button>
                        </div>
                      ) : mine?.status === 'accepted' ? (
                        <p className="nieuw-opdracht-status-msg is-success">
                          Status: <strong>Geselecteerd</strong>. Neem contact op met Class-Models voor de
                          verdere afspraken.
                        </p>
                      ) : canApply ? (
                        <div className="nieuw-opdracht-apply">
                          {mine?.status === 'withdrawn' ? (
                            <p className="nieuw-opdracht-status-msg" style={{ marginBottom: 12 }}>
                              Status: <strong className="is-uitgeschreven">Uitgeschreven</strong>. U kunt zich
                              opnieuw inschrijven.
                            </p>
                          ) : null}
                          <label className="nieuw-opdracht-apply-label" htmlFor={`extra-${b.id}`}>
                            Extra info <span className="is-optioneel">(optioneel)</span>
                          </label>
                          <textarea
                            id={`extra-${b.id}`}
                            className="nieuw-opdracht-textarea"
                            rows={3}
                            placeholder="Optioneel: opmerking of extra info voor Class-Models"
                            value={briefNote[b.id] ?? ''}
                            onChange={(e) =>
                              setBriefNote((n) => ({ ...n, [b.id]: e.target.value }))
                            }
                          />
                          <div className="nieuw-opdracht-apply-footer">
                            <p className="nieuw-lead" style={{ margin: 0, fontSize: 12 }}>
                              {mine?.status === 'withdrawn'
                                ? 'U was uitgeschreven. Schrijf u opnieuw in als u weer wilt meedoen.'
                                : 'U kunt direct inschrijven. Extra info is niet verplicht.'}
                            </p>
                            <button
                              type="button"
                              className="nieuw-btn"
                              disabled={busyId === b.id}
                              onClick={() => void submitInterest(b.id)}
                            >
                              {busyId === b.id
                                ? 'Bezig…'
                                : mine?.status === 'withdrawn'
                                  ? 'Opnieuw inschrijven'
                                  : 'Inschrijven'}
                            </button>
                          </div>
                        </div>
                      ) : mine ? (
                        <p className="nieuw-opdracht-status-msg">
                          Status:{' '}
                          <strong
                            className={
                              mine.status === 'submitted'
                                ? 'is-ingeschreven'
                                : mine.status === 'withdrawn'
                                  ? 'is-uitgeschreven'
                                  : undefined
                            }
                          >
                            {responseMeta(mine).label}
                          </strong>
                        </p>
                      ) : b.status === 'open' && !inAanmerking ? (
                        <div className="nieuw-opdracht-action-row">
                          <p className="nieuw-opdracht-status-msg is-warn">
                            Inschrijven is niet beschikbaar: uw profiel komt niet in aanmerking volgens de
                            criteria.
                          </p>
                          <Link className="nieuw-btn nieuw-btn-ghost" href="/modellen?tab=profiel">
                            Profiel controleren
                          </Link>
                        </div>
                      ) : (
                        <p className="nieuw-opdracht-status-msg">
                          Deze opdracht is niet meer open voor nieuwe inschrijvingen.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
