'use client';

import Link from 'next/link';
import { formatModelSheetRows } from '@/lib/model-sheet-display';

export type ModelSheetDialogUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  modelSheet?: Record<string, unknown> | null;
};

export function ModelSheetDialog({
  user,
  onClose,
  canEditUsers,
}: {
  user: ModelSheetDialogUser;
  onClose: () => void;
  canEditUsers?: boolean;
}) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  const rows = formatModelSheetRows(user.modelSheet ?? null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-sheet-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="model-sheet-title" className="text-sm font-semibold text-ink">
          Modellenfiche — {name}
        </h2>
        <p className="mt-0.5 text-[10px] text-muted">
          {user.email}
          {user.phone ? ` · ${user.phone}` : ''}
        </p>
        <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[11px]">
          {rows.length === 0 ? (
            <p className="text-muted">Nog geen registratiegegevens (modellenfiche leeg).</p>
          ) : (
            rows.map((row) => (
              <div key={row.key} className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-3">
                <dt className="font-semibold text-muted">{row.label}</dt>
                <dd className="break-words text-ink">{row.value}</dd>
              </div>
            ))
          )}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
          {canEditUsers ? (
            <Link
              className="rounded bg-burgundy px-3 py-1.5 text-[11px] text-white hover:bg-burgundyDeep"
              href={`/admin/gebruikers?edit=${user.id}`}
            >
              Open in Gebruikers
            </Link>
          ) : null}
          <button
            type="button"
            className="ml-auto text-[11px] text-muted hover:text-ink"
            onClick={onClose}
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}
