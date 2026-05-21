'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { AuthUser } from '@/context/auth-context';

export function ModelPortalReviewTab({
  token,
  user,
}: {
  token: string | null;
  user: AuthUser;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await apiFetch('/portal/model/reviews', {
        method: 'POST',
        token,
        body: JSON.stringify({ title: title.trim(), body: body.trim(), rating }),
      });
      setTitle('');
      setBody('');
      setRating(5);
      setMsg('Bedankt! Uw review staat nu op de site onder Reviews.');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Verzenden mislukt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 text-sm">
      <p className="leading-relaxed text-muted">
        Deel uw ervaring met Class-Models. Uw review wordt gepubliceerd onder uw naam:{' '}
        <strong className="text-ink">{displayName}</strong>.
      </p>
      <form onSubmit={(e) => void submit(e)} className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm">
        <div>
          <label className="text-xs font-semibold text-zinc-700">Titel</label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            placeholder="Bv. Geweldige fotoshoot"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-700">Uw review</label>
          <textarea
            className="mt-1 min-h-[140px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={8000}
            required
            placeholder="Schrijf hier uw ervaring…"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-700">Score (sterren)</label>
          <select
            className="mt-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} sterren
              </option>
            ))}
          </select>
        </div>
        {err ? <p className="text-xs text-red-700">{err}</p> : null}
        {msg ? <p className="text-xs text-emerald-800">{msg}</p> : null}
        <button
          type="submit"
          disabled={busy || !title.trim() || body.trim().length < 10}
          className="rounded-full bg-burgundy px-6 py-2.5 text-sm font-semibold text-white hover:bg-burgundyDeep disabled:opacity-50"
        >
          {busy ? 'Verzenden…' : 'Review verzenden'}
        </button>
      </form>
    </div>
  );
}
