import { NextResponse } from 'next/server';
import { buildNonceCookie, hasSessionSecret, makeNonce } from '@/src/lib/sessionAuth';

export async function GET() {
  if (!hasSessionSecret()) {
    return NextResponse.json(
      { error: 'Missing DASHBOARD_SESSION_SECRET in server environment.' },
      { status: 500 }
    );
  }

  const nonce = makeNonce();
  const res = NextResponse.json({ nonce });
  res.headers.append('Set-Cookie', buildNonceCookie(nonce));
  return res;
}
