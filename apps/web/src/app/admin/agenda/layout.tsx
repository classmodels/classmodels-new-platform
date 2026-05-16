'use client';

import type { ReactNode } from 'react';

export default function AdminAgendaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Agenda</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">Gebruik het menu links om onderdelen te openen.</p>
      </div>
      {children}
    </div>
  );
}
