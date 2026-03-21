const MOTUSNS_REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_MOTUSNS_REGISTRY_ADDRESS || '0x3a529655e45f2Cc194233b4Ec1BF3Fc0B3C8Fd10';
const CELO_CHAIN_ID_HEX = '0xa4ec'; // 42220

const motusNsAbi = ['function registerAgent(string label,address controller,address resolver,string metadataURI) returns (bytes32)'];

export const CELOSCAN_MOTUSNS_REGISTRY_URL = `https://celoscan.io/address/${MOTUSNS_REGISTRY_ADDRESS}`;

async function ensureCeloChain() {
  const chainId = (await window.waap?.request?.({ method: 'eth_chainId' as const })) as string | undefined;
  if (chainId?.toLowerCase() === CELO_CHAIN_ID_HEX) return;

  try {
    await window.waap?.request?.({
      method: 'wallet_switchEthereumChain',
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

function sanitizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export async function registerAgentNameOnMotusNS(input: {
  label: string;
  controller?: `0x${string}`;
  resolver?: `0x${string}`;
  metadataURI?: string;
}): Promise<string> {
  if (!window.waap?.request) {
    throw new Error('Wallet provider (WaaP) is not ready. Make sure you are logged in.');
  }

  const label = sanitizeLabel(input.label);
  if (!label) {
    throw new Error('Agent label is required.');
  }

  await ensureCeloChain();

  const [from] = (await window.waap.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!from) {
    throw new Error('No wallet address available from WaaP.');
  }

  const { Interface } = await import('ethers');
  const iface = new Interface(motusNsAbi);
  const controller = input.controller ?? (from as `0x${string}`);
  const resolver = input.resolver ?? ('0x0000000000000000000000000000000000000000' as `0x${string}`);
  const metadataURI = input.metadataURI ?? '';
  const data = iface.encodeFunctionData('registerAgent', [label, controller, resolver, metadataURI]);

  const txHash = (await window.waap.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: MOTUSNS_REGISTRY_ADDRESS,
        data,
        value: '0x0',
      },
    ] as unknown[],
  })) as string;

  return txHash;
}
