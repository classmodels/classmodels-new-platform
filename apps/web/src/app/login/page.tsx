'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get('next');
    router.replace(next ? `/?next=${encodeURIComponent(next)}` : '/');
  }, [router, searchParams]);

  return <div className="mx-auto max-w-md px-4 py-12 text-sm text-muted">Doorsturen naar beginpagina…</div>;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-sm text-muted">Laden…</div>}>
      <LoginRedirect />
    </Suspense>
  );
}
