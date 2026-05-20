'use client';

import { useParams } from 'next/navigation';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export default function ResetPasswordTokenPage() {
  const params = useParams();
  const raw = params.token;
  const tokenFromUrl = typeof raw === 'string' ? raw : Array.isArray(raw) ? (raw[0] ?? '') : '';
  return <ResetPasswordForm tokenFromUrl={tokenFromUrl} />;
}
