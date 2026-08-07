'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CatalogModel } from '@/components/models-catalog/ModelsCatalogGrid';
import { CmProgressBar } from '@/components/CmProgressBar';
import { useAuth } from '@/context/auth-context';
import { adminDownloadFile } from '@/lib/admin-api';
import { getApiBase, publicMediaUrl } from '@/lib/api';
import { formatAdminAddress, genderNl, rosterFullName, sheetStr } from '@/lib/model-fiche-helpers';

export type ModelSheetDialogUser = {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  modelSheet?: Record<string, unknown> | null;
};

function FieldBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-white px-2 py-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-serif text-xs leading-snug text-ink">{value || '—'}</p>
    </div>
  );
}

export function ModelSheetDialog({
  user,
  onClose,
  canEditUsers,
}: {
  user: ModelSheetDialogUser;
  onClose: () => void;
  canEditUsers?: boolean;
}) {
  const { token } = useAuth();
  const [detail, setDetail] = useState<CatalogModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const h = new Headers();
    if (token) h.set('Authorization', `Bearer ${token}`);
    let cancelled = false;
    setLoading(true);
    setErr(null);
    Promise.all([
      fetch(`${getApiBase()}/catalog/models/${user.id}`, { headers: h }).then(async (r) => {
        if (!r.ok) throw new Error('Fiche laden mislukt');
        return r.json() as Promise<CatalogModel>;
      }),
      fetch(`${getApiBase()}/catalog/models/${user.id}/gallery`, { headers: h })
        .then((r) => (r.ok ? r.json() : { keys: [] }))
        .then((d: { keys?: string[] }) => (Array.isArray(d.keys) ? d.keys : []))
        .catch(() => [] as string[]),
    ])
      .then(([model, keys]) => {
        if (cancelled) return;
        setDetail(model);
        setPhotoKeys(keys.length ? keys : model.profileThumbKey ? [model.profileThumbKey] : []);
        setSlideIndex(0);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Laden mislukt');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id, token]);

  const active = detail;
  const sh = active?.sheet ?? user.modelSheet ?? {};
  const v = (key: string) => sheetStr(sh as Record<string, unknown>, key) || '—';
  const title = active ? rosterFullName(active) : rosterFullName(user);
  const photoSrc = photoKeys[slideIndex] ? publicMediaUrl(photoKeys[slideIndex]) : '';
  const thumbNavDisabled = photoKeys.length <= 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-sheet-title"
      onClick={onClose}
    >
      <div
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-line bg-zinc-100 p-3 shadow-2xl sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Class-Models</p>
          <button
            type="button"
            className="rounded border border-line bg-white px-2 py-0.5 text-sm font-semibold text-ink hover:bg-panel"
            onClick={onClose}
            aria-label="Sluiten"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="mb-3">
            <CmProgressBar label="Modellenfiche laden…" />
          </div>
        ) : null}
        {err ? <p className="mb-2 text-xs text-amber-900">{err}</p> : null}

        <div className="grid gap-3 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-start">
          <div className="min-w-0">
            {photoSrc ? (
              <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoSrc}
                  alt=""
                  className="mx-auto block w-full object-contain"
                  style={{ aspectRatio: '3 / 4', maxHeight: 'min(55vh, 380px)' }}
                />
                {photoKeys.length > 0 ? (
                  <div className="flex items-center justify-between border-t border-zinc-600 bg-zinc-800 px-2 py-1 text-white">
                    <button
                      type="button"
                      disabled={thumbNavDisabled}
                      className={`px-1.5 text-base font-semibold ${thumbNavDisabled ? 'opacity-40' : 'hover:bg-white/10'}`}
                      aria-label="Vorige foto"
                      onClick={() => setSlideIndex((i) => (i <= 0 ? photoKeys.length - 1 : i - 1))}
                    >
                      ‹
                    </button>
                    <span className="text-[10px] tabular-nums">
                      {slideIndex + 1} / {photoKeys.length}
                    </span>
                    <button
                      type="button"
                      disabled={thumbNavDisabled}
                      className={`px-1.5 text-base font-semibold ${thumbNavDisabled ? 'opacity-40' : 'hover:bg-white/10'}`}
                      aria-label="Volgende foto"
                      onClick={() => setSlideIndex((i) => (i >= photoKeys.length - 1 ? 0 : i + 1))}
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex aspect-[3/4] max-h-[380px] items-center justify-center rounded-lg border border-dashed border-line bg-white text-xs text-muted">
                Geen foto
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 id="model-sheet-title" className="font-serif text-lg font-semibold text-ink sm:text-xl">
              {title}
              {active?.age != null ? (
                <span className="text-sm font-normal text-muted"> — {active.age} jaar</span>
              ) : null}
            </h2>

            <div className="mt-2 rounded border border-amber-200 bg-amber-50/90 p-2 text-[11px]">
              <p className="text-[9px] font-bold uppercase tracking-wide text-amber-950">
                Persoonlijke gegevens (admin)
              </p>
              <dl className="mt-1 space-y-0.5 text-ink">
                <div>
                  <span className="font-semibold">Familienaam: </span>
                  {(active?.lastName ?? user.lastName ?? '').trim() || '—'}
                </div>
                <div>
                  <span className="font-semibold">E-mail: </span>
                  {active?.email ?? user.email ?? '—'}
                </div>
                <div>
                  <span className="font-semibold">Telefoon: </span>
                  {v('gsmModel') !== '—' ? v('gsmModel') : user.phone || '—'}
                </div>
                <div>
                  <span className="font-semibold">Adres: </span>
                  {formatAdminAddress(sh as Record<string, unknown>)}
                </div>
              </dl>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <FieldBox label="Gemeente" value={v('gemeente')} />
              <FieldBox label="Geslacht" value={active ? genderNl(active.gender) : v('geslacht')} />
              <FieldBox label="Nationaliteit" value={v('nationaliteit')} />
              <FieldBox label="Lengte" value={v('lengte')} />
              <FieldBox label="Maat" value={v('maat')} />
              <FieldBox label="Confectiemaat" value={v('confectiemaat')} />
              <FieldBox label="Schoenmaat" value={v('schoenmaat')} />
              <FieldBox label="BH-maat" value={v('bhMaat')} />
              <FieldBox label="Borstomtrek" value={v('borstomtrek')} />
              <FieldBox label="Taille" value={v('taille')} />
              <FieldBox label="Heupomtrek" value={v('heupomtrek')} />
              <FieldBox label="Jeansmaat" value={v('jeansmaat')} />
              <FieldBox label="Haarkleur" value={v('haarkleur')} />
              <FieldBox label="Kleur ogen" value={v('kleurOgen')} />
              <div className="col-span-2">
                <FieldBox label="Ervaring" value={v('ervaringen')} />
              </div>
              <div className="col-span-2">
                <FieldBox label="Over mij" value={v('overMij')} />
              </div>
              <FieldBox label="Geboortedatum" value={v('geboortedatum')} />
              <div className="col-span-2">
                <FieldBox
                  label="Beschikbaar voor"
                  value={
                    active?.beschikbaar?.length
                      ? active.beschikbaar.join(', ')
                      : Array.isArray((sh as Record<string, unknown>).beschikbaar)
                        ? ((sh as Record<string, unknown>).beschikbaar as string[]).join(', ')
                        : '—'
                  }
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-line pt-2">
              {token ? (
                <button
                  type="button"
                  className="rounded border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-panel"
                  onClick={() => {
                    void adminDownloadFile(
                      `/admin/set-card/users/${user.id}/preview.zip`,
                      token,
                      `setkaart-${title.replace(/\s+/g, '-')}.zip`,
                    ).catch(() => window.alert('Setkaart download mislukt.'));
                  }}
                >
                  Setkaart PDF
                </button>
              ) : null}
              {canEditUsers ? (
                <Link
                  className="rounded border border-burgundy bg-white px-2.5 py-1 text-[11px] font-semibold text-burgundy hover:bg-burgundy/5"
                  href={`/admin/gebruikers?edit=${user.id}`}
                >
                  Bewerken
                </Link>
              ) : null}
              <button
                type="button"
                className="rounded border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-panel"
                onClick={onClose}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
