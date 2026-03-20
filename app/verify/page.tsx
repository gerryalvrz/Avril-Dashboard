'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PassportScoreWidget } from '@human.tech/passport-embed';
import { useWaaP } from '@/src/components/WaaPProvider';
import {
  registerAgentIdentityOnCelo,
  getAgentIdentityOnCelo,
  celoscanTxUrl,
  celoscanAgentNftUrl,
  CELOSCAN_REGISTRY_URL,
  type AgentIdentityOnCelo,
} from '@/src/lib/celo8004';

function utf8ToHex(message: string) {
  const bytes = new TextEncoder().encode(message);
  let hex = '0x';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export default function VerifyPage() {
  const router = useRouter();
  const { address, login } = useWaaP();
  const [status, setStatus] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [ensName, setEnsName] = useState('');
  const [ensStatus, setEnsStatus] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [agentIdentity, setAgentIdentity] = useState<AgentIdentityOnCelo | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_PASSPORT_EMBED_API_KEY || '';
  const scorerId = process.env.NEXT_PUBLIC_PASSPORT_SCORER_ID || '';
  const agentUri = process.env.NEXT_PUBLIC_AGENT_REGISTRATION_URI || '';

  const canRender = useMemo(() => {
    return Boolean(address && apiKey && scorerId);
  }, [address, apiKey, scorerId]);

  const connectWalletCallback = async () => {
    await login();
  };

  const generateSignatureCallback = async (message: string) => {
    if (!address) throw new Error('Missing wallet address');
    const payload = utf8ToHex(message);
    const signature = await window.waap?.request?.({
      method: 'personal_sign',
      params: [payload, address],
    });
    return typeof signature === 'string' ? signature : '';
  };

  useEffect(() => {
    if (!address) {
      setAgentIdentity(null);
      return;
    }
    let cancelled = false;
    setLoadingAgent(true);
    getAgentIdentityOnCelo(address)
      .then((data) => {
        if (!cancelled) setAgentIdentity(data);
      })
      .catch(() => {
        if (!cancelled) setAgentIdentity(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingAgent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  async function handleRegister() {
    setRegistrationStatus(null);
    setLastTxHash(null);

    if (!address) {
      await login();
    }

    if (!agentUri) {
      setRegistrationStatus('Agent registration URI is not configured. Set NEXT_PUBLIC_AGENT_REGISTRATION_URI in .env.local.');
      return;
    }

    try {
      setIsRegistering(true);
      setRegistrationStatus('Preparing ERC-8004 registration on Celo…');
      const txHash = await registerAgentIdentityOnCelo(agentUri);
      setLastTxHash(txHash);
      setRegistrationStatus('Registration submitted. View your transaction on Celoscan below.');
      if (address) {
        const data = await getAgentIdentityOnCelo(address);
        setAgentIdentity(data);
      }
    } catch (err: unknown) {
      setRegistrationStatus(err instanceof Error ? err.message : 'Failed to register agent identity on Celo.');
    } finally {
      setIsRegistering(false);
    }
  }

  async function finalize() {
    setSubmitting(true);
    setStatus('');
    try {
      const res = await fetch('/api/human/verify', { method: 'POST' });
      if (!res.ok) {
        setStatus('Not verified yet. Complete stamps in the widget and try again.');
        return;
      }
      setStatus('Verified. Redirecting…');
      router.replace('/home');
    } catch {
      setStatus('Verification check failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="font-sans space-y-6">
      <div className="glass-strong p-6 rounded-2xl">
        <h2 className="modern-typography-medium gradient-text mb-2">Human Passport verification</h2>
        <p className="text-sm text-muted">
          Verify your humanity to unlock the dashboard. When you’re done in the widget, click “Continue”.
        </p>
        {!apiKey || !scorerId ? (
          <p className="mt-4 text-sm text-yellow-300">
            Missing client config. Set <code className="font-mono">NEXT_PUBLIC_PASSPORT_EMBED_API_KEY</code> and{' '}
            <code className="font-mono">NEXT_PUBLIC_PASSPORT_SCORER_ID</code>.
          </p>
        ) : null}
        {!address ? (
          <div className="mt-4">
            <button onClick={() => void login()} className="btn-primary">
              Connect wallet
            </button>
          </div>
        ) : (
          <p className="mt-4 text-[11px] text-muted break-all">
            Wallet: <span className="text-soft-white">{address}</span>
          </p>
        )}
      </div>

      {canRender ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="glass p-4 rounded-2xl">
            <PassportScoreWidget
              apiKey={apiKey}
              address={address as `0x${string}`}
              scorerId={scorerId}
              collapseMode="off"
              connectWalletCallback={connectWalletCallback}
              generateSignatureCallback={generateSignatureCallback}
            />
          </div>

          <div className="glass p-6 rounded-2xl">
            <h3 className="font-semibold font-heading mb-2">ENS Identity</h3>
            <p className="text-sm text-muted mb-4">
              Reserve a place for ENS interactions during verification. Users can move from passport score to buying an ENS name.
            </p>

            <label htmlFor="ens-name" className="block text-xs text-muted mb-1">
              Desired ENS name
            </label>
            <div className="flex gap-2 mb-3">
              <input
                id="ens-name"
                type="text"
                value={ensName}
                onChange={(e) => setEnsName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="yourname"
                className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent smooth-transition"
              />
              <span className="inline-flex items-center px-3 rounded-xl border border-border bg-surface text-sm text-muted">.eth</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => setEnsStatus('Availability check will be connected in the next step.')}
              >
                Check availability
              </button>
              <a
                href={`https://app.ens.domains/${encodeURIComponent((ensName || 'yourname') + '.eth')}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-sm"
              >
                Buy on ENS App
              </a>
            </div>

            <ul className="mt-4 space-y-1 text-xs text-muted">
              <li>- Step 1: type preferred name</li>
              <li>- Step 2: confirm availability</li>
              <li>- Step 3: complete purchase in ENS app</li>
            </ul>
            {ensStatus ? <p className="mt-3 text-xs text-yellow-300">{ensStatus}</p> : null}
          </div>
        </div>
      ) : (
        <div className="glass p-6 rounded-2xl text-sm text-muted">
          Connect a wallet and ensure Passport Embed env vars are set to load the widget.
        </div>
      )}

      <div className="glass-strong p-6 rounded-2xl">
        <h3 className="font-semibold font-heading mb-2">Agent ID registration (ERC-8004)</h3>
        <p className="text-xs text-muted mb-3">
          Register this dashboard&apos;s agent identity on Celo using the global ERC-8004 identity registry. This uses
          your connected WaaP wallet on Celo.
        </p>

        <div className="mb-3 text-xs text-muted">
          <div className="flex items-center justify-between">
            <span className="font-medium text-white/80">Connected address</span>
            <span className="font-mono">
              {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected'}
            </span>
          </div>
        </div>

        {address && (
          <div className="mb-4 rounded-lg bg-white/5 border border-white/10 p-3 text-xs">
            <div className="font-medium text-white/80 mb-1.5">Registration on Celo</div>
            {loadingAgent ? (
              <p className="text-muted">Checking…</p>
            ) : agentIdentity && agentIdentity.balance > 0 ? (
              <div className="space-y-1.5">
                {agentIdentity.agentId != null ? (
                  <p className="text-muted">
                    Agent identity <span className="text-white font-medium">#{agentIdentity.agentId}</span>
                  </p>
                ) : (
                  <p className="text-muted">Registered ({agentIdentity.balance} agent identity)</p>
                )}
                {agentIdentity.agentId != null && (
                  <a
                    href={celoscanAgentNftUrl(agentIdentity.agentId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline block"
                  >
                    View agent NFT on Celoscan →
                  </a>
                )}
              </div>
            ) : (
              <p className="text-muted">No agent registered on Celo for this wallet.</p>
            )}
            {lastTxHash && (
              <a
                href={celoscanTxUrl(lastTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline block mt-2"
              >
                View registration tx on Celoscan →
              </a>
            )}
            <a
              href={CELOSCAN_REGISTRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline block mt-1"
            >
              View registry contract on Celoscan →
            </a>
          </div>
        )}

        <button
          type="button"
          className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => void handleRegister()}
          disabled={isRegistering}
        >
          {isRegistering ? 'Registering on Celo…' : 'Register ERC-8004 identity on Celo'}
        </button>

        {agentUri && (
          <p className="mt-3 text-[11px] text-muted break-all">
            Using registration URI: <span className="text-white/80">{agentUri}</span>
          </p>
        )}

        {registrationStatus && <p className="mt-3 text-xs text-muted">{registrationStatus}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => void finalize()} className="btn-primary" disabled={submitting || !address}>
          {submitting ? 'Checking…' : 'Continue'}
        </button>
        {status ? <p className="text-sm text-muted">{status}</p> : null}
      </div>
    </div>
  );
}

