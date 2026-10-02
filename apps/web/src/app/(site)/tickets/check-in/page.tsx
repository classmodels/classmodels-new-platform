'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NieuwShell } from '@/components/nieuw/NieuwShell';

function CheckInHintInner() {
  const sp = useSearchParams();
  const code = sp.get('code') || '';
  return (
    <NieuwShell portal="gasten">
      <div className="nieuw-wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 640 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: '#191919' }}>Ticket QR</h1>
        <p style={{ color: '#525049', lineHeight: 1.6 }}>
          Dit is de QR-link van je ticket. Check-in gebeurt door het Class-Models-team via de admin.
        </p>
        <p style={{ color: '#525049', lineHeight: 1.6, marginTop: 12 }}>
          Gastregistratie vóór aankomst verloopt via{' '}
          <Link href={code ? `/tickets/claim?code=${encodeURIComponent(code)}` : '/tickets/claim'} style={{ color: '#856b3f', fontWeight: 700 }}>
            ticketregistratie (claim)
          </Link>
          . Scan de QR op je PDF-ticket of open de claimlink uit je e-mail.
        </p>
        {code ? (
          <p style={{ marginTop: 16 }}>
            Code: <code style={{ fontSize: 16 }}>{code}</code>
            {' · '}
            <Link href={`/tickets/claim?code=${encodeURIComponent(code)}`} style={{ color: '#856b3f', fontWeight: 700 }}>
              Registreer dit ticket
            </Link>
          </p>
        ) : null}
        <p style={{ marginTop: 24 }}>
          <Link href="/tickets" style={{ color: '#856b3f', fontWeight: 700 }}>
            Naar ticketshop
          </Link>
        </p>
      </div>
    </NieuwShell>
  );
}

export default function TicketCheckInPublicPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48 }}>Laden…</div>}>
      <CheckInHintInner />
    </Suspense>
  );
}
