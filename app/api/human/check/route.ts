import { NextResponse } from 'next/server';
import { readSession } from '@/src/lib/sessionAuth';
import { verifyHumanTechSession } from '@/src/lib/humantech';

/**
 * GET: Check if the current wallet address passes Human Passport verification.
 * Prefers the authenticated session, but also accepts an explicit `address`
 * query param so WaaP logins work even if no session cookie is present.
 *
 * Uses server-side Passport API (PASSPORT_API_KEY, PASSPORT_SCORER_ID).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const session = readSession(req);
  const addressFromQuery = url.searchParams.get('address') || undefined;

  const address = (addressFromQuery || session?.address || '').trim();
  if (!address) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const identity = await verifyHumanTechSession(address);
  return NextResponse.json({ ok: true, verified: !!identity });
}
