const IDENTITY_REGISTRY_ADDRESS = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const CELO_CHAIN_ID_HEX = '0xa4ec'; // 42220

const identityRegistryAbi = [
  'function register(string agentURI, bytes metadata) returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
];

async function ensureCeloChain() {
  const chainId = (await window.waap?.request?.({ method: 'eth_chainId' as const })) as string | undefined;
  if (chainId?.toLowerCase() === CELO_CHAIN_ID_HEX) return;

  try {
    await window.waap?.request?.({
      method: 'wallet_switchEthereumChain',
      // WaaP typings expect params: unknown[]; cast to satisfy TS
      params: [{ chainId: CELO_CHAIN_ID_HEX }] as unknown[],
    });
  } catch (err: any) {
    if (err?.code !== 4902) throw err;

    const rpcUrl = process.env.NEXT_PUBLIC_CELO_RPC_URL;
    await window.waap?.request?.({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: CELO_CHAIN_ID_HEX,
          chainName: 'Celo',
          nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
          rpcUrls: rpcUrl ? [rpcUrl] : [],
          blockExplorerUrls: ['https://celoscan.io'],
        },
      ] as unknown[],
    });
  }
}

export async function registerAgentIdentityOnCelo(agentURI: string): Promise<string> {
  if (!window.waap?.request) {
    throw new Error('Wallet provider (WaaP) is not ready. Make sure you are logged in.');
  }

  if (!agentURI) {
    throw new Error('Agent registration URI is not configured.');
  }

  await ensureCeloChain();

  const [from] = (await window.waap.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!from) {
    throw new Error('No wallet address available from WaaP.');
  }

  const { Interface } = await import('ethers');
  const iface = new Interface(identityRegistryAbi);

  // Pre-check: if this wallet already has an agent identity, contract will revert
  const rpcUrl = process.env.NEXT_PUBLIC_CELO_RPC_URL || 'https://forno.celo.org';
  const balanceOfData = iface.encodeFunctionData('balanceOf', [from]);
  const balanceRes = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        { to: IDENTITY_REGISTRY_ADDRESS, data: balanceOfData },
        'latest',
      ],
    }),
  });
  const balanceJson = (await balanceRes.json()) as { result?: string };
  const balanceHex = balanceJson.result ?? '0x0';
  const balance = BigInt(balanceHex);
  if (balance > 0n) {
    throw new Error(
      'This wallet already has an ERC-8004 agent identity on Celo. Use a different wallet to register another agent, or update your existing agent’s URI on Celoscan (contract setAgentURI).'
    );
  }

  const data = iface.encodeFunctionData('register', [agentURI, '0x']);

  const txHash = (await window.waap.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: IDENTITY_REGISTRY_ADDRESS,
        data,
        value: '0x0',
      },
    ] as unknown[],
  })) as string;

  return txHash;
}

