'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

function basePathPrefix(): string {
  const bp = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim().replace(/\/$/, '');
  return bp.startsWith('/') ? bp : bp ? `/${bp}` : '';
}

function ResetPasswordRedirectOrForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenQ = searchParams.get('token')?.trim() ?? '';

  useEffect(() => {
    if (!tokenQ) return;
    const clean = tokenQ.replace(/\s+/g, '');
    router.replace(`${basePathPrefix()}/reset-password/${encodeURIComponent(clean)}`);
  }, [tokenQ, router]);

  if (tokenQ) {
    return <div className="p-12 text-center text-sm text-muted">Link wordt geladen…</div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-2xl text-burgundy">Nieuw wachtwoord</h1>
      <p className="mt-3 text-sm text-red-700">
        Geen geldige resetlink. Gebruik de knop in de e-mail of vraag hieronder een nieuwe link aan.
      </p>
      <Link href="/wachtwoord-vergeten" className="mt-6 inline-block text-sm text-burgundy underline">
        Wachtwoord vergeten
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-muted">Laden…</div>}>
      <ResetPasswordRedirectOrForm />
    </Suspense>
  );
}
