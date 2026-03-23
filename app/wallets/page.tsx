'use client';

import { useState, useEffect } from 'react';
import { useWaaP } from '@/src/components/WaaPProvider';
import Badge from '@/src/components/ui/Badge';
import Card from '@/src/components/ui/Card';
import SectionTitle from '@/src/components/ui/SectionTitle';
import AgenticWalletLayerPanel from '@/src/components/AgenticWalletLayerPanel';

type ControlState = {
  pendingApprovals?: Array<{
    _id: string;
    resourceType: string;
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
    createdAt: string;
  }>;
  deploymentJob?: { status?: string } | null;
  runtimeInstance?: { status?: string } | null;
};

export default function WalletsPage() {
  const { address } = useWaaP();
  const [humanVerified, setHumanVerified] = useState<boolean | null>(null);
  const [loadingHuman, setLoadingHuman] = useState(false);
  const [state, setState] = useState<ControlState | null>(null);
  const [loadingState, setLoadingState] = useState(false);

  useEffect(() => {
    if (!address) {
      setHumanVerified(null);
      return;
    }
    let cancelled = false;
    setLoadingHuman(true);
    const query = new URLSearchParams({ address });
    fetch(`/api/human/check?${query.toString()}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { ok: false }))
      .then((data) => {
        if (!cancelled && data?.ok === true) setHumanVerified(data.verified === true);
        else if (!cancelled) setHumanVerified(false);
      })
      .catch(() => {
        if (!cancelled) setHumanVerified(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingHuman(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    setLoadingState(true);
    fetch('/api/control/state', { cache: 'no-store', credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setState({
            pendingApprovals: data.pendingApprovals ?? [],
            deploymentJob: data.deploymentJob ?? null,
            runtimeInstance: data.runtimeInstance ?? null,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingState(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="font-sans space-y-8">
      <SectionTitle title="Identity and Approvals" subtitle="Session identity, Human verification, and live approval posture." />
      <AgenticWalletLayerPanel />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <Card className="p-6 lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-semibold font-heading mb-2">Connected identity</h3>
            {!address ? (
              <p className="text-xs text-muted">No wallet connected.</p>
            ) : (
              <p className="text-xs text-muted font-mono break-all">{address}</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold font-heading mb-2">Control-plane approval state</h3>
            {loadingState ? (
              <p className="text-xs text-muted">Loading control-plane state…</p>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap mb-3">
                  <Badge className="bg-amber-500/10 text-amber-400">
                    Pending approvals: {state?.pendingApprovals?.length ?? 0}
                  </Badge>
                  <Badge className="bg-blue-500/10 text-blue-400">
                    Deployment: {state?.deploymentJob?.status ?? 'none'}
                  </Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-400">
                    Runtime: {state?.runtimeInstance?.status ?? 'none'}
                  </Badge>
                </div>
                {!state?.pendingApprovals?.length ? (
                  <p className="text-xs text-muted">No pending approvals.</p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {state.pendingApprovals.slice(0, 10).map((a) => (
                      <li key={a._id} className="border border-white/10 rounded-lg px-3 py-2">
                        <p className="text-white">{a.resourceType}</p>
                        <p className="text-muted">{a.reason || 'Approval required'}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold font-heading mb-2">Human verification (Passport)</h3>
            <p className="text-xs text-muted mb-3">
              Verify your wallet with Human Passport to prove humanity. Required for some dashboard features.
            </p>
            {!address ? (
              <p className="text-xs text-muted">Connect a wallet to see verification status.</p>
            ) : loadingHuman ? (
              <p className="text-xs text-muted">Checking…</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`inline-flex items-center gap-1.5 ${
                      humanVerified === true
                        ? 'bg-green-500/10 text-green-400'
                        : humanVerified === false
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-white/10 text-muted'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        humanVerified === true ? 'bg-green-400' : humanVerified === false ? 'bg-amber-400' : 'bg-muted'
                      }`}
                    />
                    {humanVerified === true ? 'Verified' : humanVerified === false ? 'Not verified' : 'Unknown'}
                  </Badge>
                </div>
                <a
                  href="/verify"
                  className="inline-block text-sm text-accent hover:underline"
                >
                  {humanVerified === true ? 'View verification page' : 'Complete verification →'}
                </a>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

