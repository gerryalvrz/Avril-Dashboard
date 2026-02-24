import { verifyMessage } from 'ethers';
import { NextResponse } from 'next/server';
import {
  buildSessionCookie,
  clearNonceCookie,
  clearSessionCookie,
  createSessionToken,
  getNonceFromRequest,
  hasSessionSecret,
  requireOwnerSession,
} from '@/src/lib/sessionAuth';

type Body = {
  address?: string;
  signature?: string;
};

function authMessage(nonce: string) {
  return `AgentDashboard auth nonce: ${nonce}`;
}

export async function POST(req: Request) {
  if (!hasSessionSecret()) {
    return NextResponse.json(
      { error: 'Missing DASHBOARD_SESSION_SECRET in server environment.' },
      { status: 500 }
    );
  }

  const nonce = getNonceFromRequest(req);
  if (!nonce) {
    return NextResponse.json({ error: 'Missing auth nonce.' }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  const address = (body.address || '').toLowerCase();
  const signature = body.signature || '';
  const owner = (process.env.NEXT_PUBLIC_OWNER_WALLET || '').toLowerCase();

  if (!address || !signature) {
    return NextResponse.json({ error: 'address and signature are required.' }, { status: 400 });
  }

  const message = authMessage(nonce);

  try {
    const recovered = verifyMessage(message, signature).toLowerCase();
    if (recovered !== address) {
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }

    if (owner && recovered !== owner) {
      return NextResponse.json({ error: 'Wallet not allowed.' }, { status: 403 });
    }

    const token = createSessionToken(recovered);
    if (!token) {
      return NextResponse.json({ error: 'Session secret missing.' }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true });
    res.headers.append('Set-Cookie', buildSessionCookie(token));
    res.headers.append('Set-Cookie', clearNonceCookie());
    return res;
  } catch {
    return NextResponse.json({ error: 'Failed to validate signature.' }, { status: 401 });
  }
}

export async function GET(req: Request) {
  return NextResponse.json({ ok: requireOwnerSession(req) });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', clearSessionCookie());
  res.headers.append('Set-Cookie', clearNonceCookie());
  return res;
}
