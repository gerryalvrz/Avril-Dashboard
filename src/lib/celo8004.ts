const IDENTITY_REGISTRY_ADDRESS = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const CELO_CHAIN_ID_HEX = '0xa4ec'; // 42220

// Celo (and this deployment) use register(string) only; no register(string, bytes) overload
const identityRegistryAbi = [
  'function register(string agentURI) returns (uint256)',
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

  // Pre-check and simulate using the wallet's RPC (more reliable than a separate fetch)
  const balanceOfData = iface.encodeFunctionData('balanceOf', [from]);
  const balanceHex = (await window.waap!.request!({
    method: 'eth_call',
    params: [
      { to: IDENTITY_REGISTRY_ADDRESS, data: balanceOfData },
      'latest',
    ],
  } as { method: string; params: unknown[] })) as string;
  const balance = BigInt(balanceHex ?? '0x0');
  if (balance > 0n) {
    throw new Error(
      'This wallet already has an ERC-8004 agent identity on Celo. Use a different wallet to register another agent, or update your existing agent’s URI on Celoscan (contract setAgentURI).'
    );
  }

  const data = iface.encodeFunctionData('register', [agentURI]);

  // Simulate the tx so we can surface the revert reason before the user signs
  let simError: { message?: string; data?: string } | null = null;
  try {
    const simResult = (await window.waap!.request!({
      method: 'eth_call',
      params: [
        { from, to: IDENTITY_REGISTRY_ADDRESS, data, value: '0x0' },
        'latest',
      ],
    } as { method: string; params: unknown[] })) as string | { error?: { message?: string; data?: string } };
    if (typeof simResult === 'object' && simResult?.error) simError = simResult.error;
  } catch (err: unknown) {
    const e = err as { error?: { message?: string; data?: string }; message?: string; data?: string };
    simError = e?.error ?? { message: e?.message ?? 'execution reverted', data: e?.data };
  }
  if (simError) {
    const msg = simError.message ?? 'execution reverted';
    const dataHex = simError.data;
    let reason = msg;
    if (dataHex && typeof dataHex === 'string' && dataHex.length > 10) {
      try {
        const { AbiCoder } = await import('ethers');
        const tupleHex = dataHex.startsWith('0x') ? dataHex.slice(10) : dataHex.slice(8);
        if (tupleHex.length >= 128) {
          const decoded = AbiCoder.defaultAbiCoder().decode(
            ['string'],
            '0x' + tupleHex.slice(64)
          );
          reason = decoded?.[0] ?? msg;
        }
      } catch {
        reason = msg;
      }
    }
    throw new Error(
      `Registration would fail onchain: ${reason}. If this wallet already has an agent, use a different wallet or update the existing agent on Celoscan.`
    );
  }

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

