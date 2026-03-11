import { NextResponse } from 'next/server';
import { buildSessionCookie, createSessionToken, readSession } from '@/src/lib/sessionAuth';
import { verifyHumanTechSession } from '@/src/lib/humantech';

export async function POST(req: Request) {
  const session = readSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const identity = await verifyHumanTechSession(session.address);
  if (!identity) {
    return NextResponse.json({ ok: false, human: false }, { status: 403 });
  }

  const upgraded = createSessionToken(session.address, { human: true });
  if (!upgraded) {
    return NextResponse.json({ ok: false, error: 'Session secret missing.' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, human: true, walletAddress: identity.walletAddress });
  res.headers.append('Set-Cookie', buildSessionCookie(upgraded));
  return res;
}

