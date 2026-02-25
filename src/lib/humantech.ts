export type HumanTechIdentity = {
  walletAddress: string;
  did?: string;
  signatureVerified: boolean;
};

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function isEthereumAddress(value: string): boolean {
  return ETH_ADDRESS_REGEX.test(value.trim());
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Verify a wallet address via Human Passport (human.tech).
 * Uses the Stamps API v2: https://docs.passport.xyz/building-with-passport/stamps/passport-api
 *
 * Required env: PASSPORT_API_KEY, PASSPORT_SCORER_ID
 * Optional: PASSPORT_SCORE_THRESHOLD (default 20)
 *
 * If the input is not an Ethereum address, or Passport is not configured, returns null.
 */
export async function verifyHumanTechSession(tokenOrAddress: string): Promise<HumanTechIdentity | null> {
  const raw = tokenOrAddress?.trim();
  if (!raw) return null;

  if (!isEthereumAddress(raw)) {
    return null;
  }

  const address = normalizeAddress(raw);
  const apiKey = process.env.PASSPORT_API_KEY;
  const scorerId = process.env.PASSPORT_SCORER_ID;
  const threshold = Math.max(0, parseInt(process.env.PASSPORT_SCORE_THRESHOLD ?? '20', 10)) || 20;

  if (!apiKey || !scorerId) {
    return null;
  }

  const url = `https://api.passport.xyz/v2/stamps/${encodeURIComponent(scorerId)}/score/${encodeURIComponent(address)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      address?: string;
      score?: number | string;
      passing_score?: boolean;
      error?: string | null;
    };

    if (data.error) {
      return null;
    }

    const score = typeof data.score === 'number'
      ? data.score
      : typeof data.score === 'string'
        ? parseFloat(data.score)
        : 0;
    const passing = data.passing_score === true || (Number.isFinite(score) && score >= threshold);

    if (!passing) {
      return null;
    }

    return {
      walletAddress: data.address ?? address,
      did: undefined,
      signatureVerified: true,
    };
  } catch {
    return null;
  }
}
