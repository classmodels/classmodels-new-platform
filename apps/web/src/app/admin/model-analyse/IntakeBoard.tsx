'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
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
    <div className="text-sm">
      <p className="mb-3 text-muted">{rows.length} {mode === 'open' ? 'niet afgewerkt' : 'afgewerkt'}</p>
      {err ? <p className="mb-3 text-red-700">{err}</p> : null}
      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-zinc-50 text-[11px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">Datum</th>
              <th className="px-3 py-2 font-medium">Naam</th>
              <th className="px-3 py-2 font-medium">E-mail</th>
              <th className="px-3 py-2 font-medium">Profiel</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Foto’s</th>
              {mode === 'paid' ? <th className="px-3 py-2 font-medium">Dossier</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const label = statusLabel(row);
              const shots = photos[row.id] || {};
              const show = mode === 'paid' && openId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr className="border-b border-line align-middle">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">{new Date(row.createdAt).toLocaleString('nl-BE')}</td>
                    <td className="px-3 py-2 font-medium">{row.firstName} {row.lastName}</td>
                    <td className="px-3 py-2"><a className="text-ink underline" href={`mailto:${row.email}`}>{row.email}</a></td>
                    <td className="px-3 py-2 text-xs text-muted">{person(row)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${label === 'Afgewerkt' ? 'bg-emerald-100 text-emerald-800' : label === 'Niet afgewerkt' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {PHOTO.map(([slot, name]) =>
                          shots[slot] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={slot} src={shots[slot]} alt={name} title={name} className="h-10 w-8 rounded object-cover" />
                          ) : null,
                        )}
                      </div>
                    </td>
                    {mode === 'paid' ? (
                      <td className="px-3 py-2">
                        {row.report ? (
                          <button className="text-xs font-medium underline" type="button" onClick={() => setOpenId(show ? '' : row.id)}>
                            {show ? 'Sluiten' : 'Openen'}
                          </button>
                        ) : (
                          <button className="text-xs font-medium underline disabled:opacity-60" type="button" disabled={busyId === row.id} onClick={() => void fetchReport(row)}>
                            {busyId === row.id ? 'Bezig…' : 'Ophalen'}
                          </button>
                        )}
                        <span className="mt-1 block text-[11px] text-muted">Mail {row.emailSent ? 'verstuurd' : 'niet verstuurd'}</span>
                      </td>
                    ) : null}
                  </tr>
                  {show && row.report ? (
                    <tr className="border-b border-line bg-zinc-50">
                      <td className="px-3 py-4" colSpan={7}>
                        <Report report={row.report} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? <p className="px-3 py-6 text-muted">Geen dossiers.</p> : null}
      </div>
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
