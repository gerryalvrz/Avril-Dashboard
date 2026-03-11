'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PassportScoreWidget } from '@human.tech/passport-embed';
import { useWaaP } from '@/src/components/WaaPProvider';

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

  const apiKey = process.env.NEXT_PUBLIC_PASSPORT_EMBED_API_KEY || '';
  const scorerId = process.env.NEXT_PUBLIC_PASSPORT_SCORER_ID || '';

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
      ) : (
        <div className="glass p-6 rounded-2xl text-sm text-muted">
          Connect a wallet and ensure Passport Embed env vars are set to load the widget.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={() => void finalize()} className="btn-primary" disabled={submitting || !address}>
          {submitting ? 'Checking…' : 'Continue'}
        </button>
        {status ? <p className="text-sm text-muted">{status}</p> : null}
      </div>
    </div>
  );
}

