import { NextResponse } from 'next/server';
import { readSession } from '@/src/lib/sessionAuth';

export async function GET(req: Request) {
  const session = readSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, address: session.address, human: session.human });
}

