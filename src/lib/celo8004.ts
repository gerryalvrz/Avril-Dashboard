const IDENTITY_REGISTRY_ADDRESS = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const CELO_CHAIN_ID_HEX = '0xa4ec'; // 42220

const identityRegistryAbi = [
  'function register(string agentURI, bytes metadata) returns (uint256)',
];

type Eip1193RequestArgs = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

async function ensureCeloChain() {
  const chainId = (await window.waap?.request?.({ method: 'eth_chainId' as const })) as string | undefined;
  if (chainId?.toLowerCase() === CELO_CHAIN_ID_HEX) return;

  try {
    await window.waap?.request?.({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CELO_CHAIN_ID_HEX }],
    } as Eip1193RequestArgs);
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
      ],
    } as Eip1193RequestArgs);
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
    ],
  } as Eip1193RequestArgs)) as string;

  return txHash;
}

