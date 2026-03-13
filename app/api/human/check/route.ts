import { NextResponse } from 'next/server';
import { readSession } from '@/src/lib/sessionAuth';
import { verifyHumanTechSession } from '@/src/lib/humantech';

/**
 * GET: Check if the current session's wallet address passes Human Passport verification.
 * Uses server-side Passport API (PASSPORT_API_KEY, PASSPORT_SCORER_ID).
 */
export async function GET(req: Request) {
  const session = readSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const identity = await verifyHumanTechSession(session.address);
  return NextResponse.json({ ok: true, verified: !!identity });
}
