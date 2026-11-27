import { handleModelprofiel } from '@/lib/modelprofiel.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleModelprofiel(request);
}

export async function POST(request: Request) {
  return handleModelprofiel(request);
}
