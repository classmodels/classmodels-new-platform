'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import type { ModelReport } from '@/lib/model-analyse';

type Intake = {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  ageGroup: string;
  heightCm: number | null;
  childAge: number | null;
  paymentStatus: string;
  emailSent: boolean;
  report: ModelReport | null;
};

const PHOTO = [
  ['full', 'Volledig'],
  ['face', 'Gezicht'],
  ['side', 'Zijkant'],
] as const;

function paid(row: Intake) {
  return row.paymentStatus === 'paid' || row.paymentStatus === 'analyzing' || Boolean(row.report);
}

function statusLabel(row: Intake) {
  if (row.report) return 'Afgewerkt';
  if (row.paymentStatus === 'analyzing') return 'Analyse loopt';
  if (row.paymentStatus === 'paid') return 'Betaald, analyse nog niet gemaakt';
  return 'Niet afgewerkt';
}

function person(row: Intake) {
  const who = row.gender === 'women' ? 'Vrouw' : row.gender === 'men' ? 'Man' : row.gender;
  const age = row.ageGroup === 'child' ? `Kind${row.childAge ? `, ${row.childAge} jaar` : ''}` : 'Volwassene';
  return [who, age, row.heightCm ? `${row.heightCm} cm` : ''].filter(Boolean).join(' · ');
}

export function IntakeBoard({ mode }: { mode: 'open' | 'paid' }) {
  const { token } = useAuth();
  const [rows, setRows] = useState<Intake[]>([]);
  const [photos, setPhotos] = useState<Record<string, Record<string, string>>>({});
  const [openId, setOpenId] = useState('');
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/model-intake?admin=1', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Laden mislukt');
    const all = (data.intakes || []) as Intake[];
    setRows(all.filter((row) => (mode === 'paid' ? paid(row) : !paid(row))));
  }, [token, mode]);

  useEffect(() => {
    load().catch((error: Error) => setErr(error.message));
  }, [load]);

  useEffect(() => {
    if (!token || !rows.length) return;
    let stop = false;
    void (async () => {
      const next: Record<string, Record<string, string>> = {};
      for (const row of rows.slice(0, 30)) {
        const slots: Record<string, string> = {};
        for (const [slot] of PHOTO) {
          const res = await fetch(`/api/model-intake?photo=${row.id}&slot=${slot}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) continue;
          slots[slot] = URL.createObjectURL(await res.blob());
        }
        next[row.id] = slots;
        if (stop) return;
      }
      if (!stop) setPhotos(next);
    })();
    return () => {
      stop = true;
    };
  }, [token, rows]);

  async function fetchReport(row: Intake) {
    setBusyId(row.id);
    setErr('');
    try {
      const res = await fetch(`/api/model-intake?id=${encodeURIComponent(row.id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setErr(data.error || 'De analyse is niet gelukt.');
        return;
      }
      if (!data.report) {
        setErr('De analyse is nog bezig. Vernieuw zo meteen.');
        return;
      }
      await load();
      setOpenId(row.id);
    } catch {
      setErr('De analyse is niet gelukt.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-4 p-4 text-sm">
      <h1 className="text-xl font-semibold">{mode === 'open' ? 'Begonnen, niet betaald' : 'Afgewerkte analyses'}</h1>
      <p className="max-w-2xl text-muted">
        {mode === 'open'
          ? 'Iemand is de analyse begonnen en heeft nog niet betaald. De status blijft niet afgewerkt.'
          : 'Betaalde analyses. Open een dossier voor de volledige tekst en de foto’s.'}
      </p>
      {err ? <p className="text-red-700">{err}</p> : null}
      {rows.map((row) => {
        const label = statusLabel(row);
        const shots = photos[row.id] || {};
        const show = mode === 'paid' && openId === row.id;
        return (
          <article key={row.id} className="rounded-md border border-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{row.firstName} {row.lastName}</p>
                <p className="mt-1">
                  <a className="text-burgundy underline" href={`mailto:${row.email}`}>{row.email}</a>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(row.createdAt).toLocaleString('nl-BE')} · {person(row)}
                  {mode === 'paid' ? ` · mail ${row.emailSent ? 'verstuurd' : 'niet verstuurd'}` : ` · Mollie: ${row.paymentStatus || 'open'}`}
                </p>
              </div>
              <span className={`rounded px-2 py-1 text-xs font-semibold ${label === 'Afgewerkt' ? 'bg-emerald-100 text-emerald-800' : label === 'Niet afgewerkt' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'}`}>
                {label}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              {PHOTO.map(([slot, name]) =>
                shots[slot] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={slot} src={shots[slot]} alt={name} title={name} className="h-28 w-20 rounded object-cover" />
                ) : null,
              )}
            </div>
            {mode === 'paid' ? (
              <div className="mt-3">
                {row.report ? (
                  <button className="border border-line px-3 py-1.5" type="button" onClick={() => setOpenId(show ? '' : row.id)}>
                    {show ? 'Analyse sluiten' : 'Volledige analyse'}
                  </button>
                ) : (
                  <button className="border border-line bg-zinc-900 px-3 py-1.5 text-white disabled:opacity-60" type="button" disabled={busyId === row.id} onClick={() => void fetchReport(row)}>
                    {busyId === row.id ? 'Bezig…' : 'Volledige analyse ophalen'}
                  </button>
                )}
              </div>
            ) : null}
            {show && row.report ? <Report report={row.report} /> : null}
          </article>
        );
      })}
      {!rows.length ? <p className="text-muted">{mode === 'open' ? 'Geen begonnen analyses.' : 'Nog geen betaalde analyses.'}</p> : null}
    </div>
  );
}

function Report({ report }: { report: ModelReport }) {
  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4">
      <p className="font-serif text-3xl text-burgundy">{report.overall == null ? 'voorlopig' : `${report.overall}%`}</p>
      {report.summary ? <p>{report.summary}</p> : null}
      {report.overallNote ? <p className="text-muted">{report.overallNote}</p> : null}
      {report.measures?.length ? (
        <section>
          <h2 className="font-semibold">Maten</h2>
          <ul className="mt-2 space-y-2">
            {report.measures.map((row) => (
              <li key={`${row.part}-${row.value}`}>
                <span className="font-medium">{row.part}</span> · {row.value} {row.unit}
                <span className="mt-0.5 block text-xs text-muted">{row.meaning}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Points title="Gunstige bevindingen" items={report.strengths} />
      <Points title="Aandachtspunten" items={report.weaker} />
      {report.directions?.length ? (
        <section>
          <h2 className="font-semibold">Opdrachtgebieden</h2>
          <ul className="mt-2 space-y-2">
            {report.directions.map((item) => (
              <li key={item.label}>
                <span className="font-medium">{item.label}</span> · {item.score == null ? 'nader te bepalen' : `${item.score}%`}
                <span className="mt-0.5 block text-xs text-muted">{[item.qualification, item.why, item.limit, item.unknown].filter(Boolean).join(' ')}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {report.forCandidate ? (
        <section>
          <h2 className="font-semibold">Voor de kandidaat</h2>
          <p className="mt-1">{report.forCandidate}</p>
        </section>
      ) : null}
      {report.forBureau ? (
        <section>
          <h2 className="font-semibold">Voor het bureau</h2>
          <p className="mt-1">{report.forBureau}</p>
        </section>
      ) : null}
      {report.extra ? <p>{report.extra}</p> : null}
    </div>
  );
}

function Points({ title, items }: { title: string; items: ModelReport['strengths'] }) {
  if (!items?.length) return null;
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.title}>
            <span className="font-medium">{item.title}</span>
            <span className="mt-0.5 block text-xs text-muted">{item.observation} {item.meaning}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
