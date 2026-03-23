import { NextRequest } from 'next/server';

/**
 * Serves the ERC-8004 agent registration JSON.
 * Use this URL as NEXT_PUBLIC_AGENT_REGISTRATION_URI (e.g. https://app.avril.life/agent-registration.json).
 */
export async function GET(request: NextRequest) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin ||
    'https://app.avril.life';

  const body = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'Avril Dashboard',
    description:
      'Control plane for Avril multi-agent operations. Orchestrates workers, chats, and onchain identity (ERC-8004) on Celo.',
    image: `${base}/agent-logo.svg`,
    services: [
      {
        name: 'A2A',
        endpoint: `${base}/.well-known/agent-card.json`,
        version: '0.3.0',
      },
    ],
    x402Support: false,
    active: true,
    supportedTrust: ['reputation'],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
