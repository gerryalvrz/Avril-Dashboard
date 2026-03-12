import { NextResponse } from 'next/server';

const CELO_REGISTRY = 'eip155:42220:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

/**
 * Domain proof for ERC-8004. Set after your first onchain registration:
 * NEXT_PUBLIC_ERC8004_AGENT_ID=<tokenId>
 * NEXT_PUBLIC_ERC8004_AGENT_OWNER=<0xYourWallet>
 */
export async function GET() {
  const agentId = process.env.NEXT_PUBLIC_ERC8004_AGENT_ID ?? '0';
  const owner =
    process.env.NEXT_PUBLIC_ERC8004_AGENT_OWNER ??
    '0x0000000000000000000000000000000000000000';

  const body = {
    agentId: Number(agentId) || 0,
    agentRegistry: CELO_REGISTRY,
    owner,
  };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
