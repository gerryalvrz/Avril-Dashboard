'use client';

import { useMemo, useState } from 'react';
import {
  buildDefaultRoleInput,
  sanitizeStartupName,
  type StartupRoleInput,
  type StartupRoleTemplate,
} from '@/src/lib/startupAgentGenerator';

type MatrixRow = {
  role: string;
  delegateEoa: string;
  contextWallet: string;
  ens: string | null;
  erc8004: string;
  txHashes: Record<string, string | null>;
};

type GeneratorApiResponse = {
  ok: boolean;
  output?: string;
  startup?: string;
  roles?: number;
  roleMatrix?: MatrixRow[];
  error?: string;
};

const ROLE_OPTIONS: StartupRoleTemplate[] = [
  'ceo-agent',
  'sales-agent',
  'support-agent',
  'research-agent',
  'ops-agent',
  'custom',
];

export default function StartupAgentGeneratorPage() {
  const [startupName, setStartupName] = useState('');
  const [selectedRole, setSelectedRole] = useState<StartupRoleTemplate>('ceo-agent');
  const [customRole, setCustomRole] = useState('');
  const [roles, setRoles] = useState<StartupRoleInput[]>([
    buildDefaultRoleInput('ceo-agent'),
    buildDefaultRoleInput('sales-agent'),
    buildDefaultRoleInput('support-agent'),
  ]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratorApiResponse | null>(null);

  const startupSlug = useMemo(() => sanitizeStartupName(startupName), [startupName]);

  function addRole() {
    if (selectedRole === 'custom') {
      const role = sanitizeStartupName(customRole);
      if (!role) {
        setStatus('Custom role must be non-empty.');
        return;
      }
      setRoles((prev) => [...prev, { role, policy: { spendingLimit: '0', dailyLimit: '0', ttl: 86400, allowlist: [] } }]);
      setCustomRole('');
      return;
    }
    setRoles((prev) => [...prev, buildDefaultRoleInput(selectedRole)]);
  }

  function removeRole(index: number) {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePolicy(index: number, field: 'spendingLimit' | 'dailyLimit' | 'ttl' | 'allowlist', value: string) {
    setRoles((prev) =>
      prev.map((role, i) => {
        if (i !== index) return role;
        if (field === 'ttl') {
          return { ...role, policy: { ...role.policy, ttl: Number(value || 0) } };
        }
        if (field === 'allowlist') {
          return {
            ...role,
            policy: {
              ...role.policy,
              allowlist: value
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean),
            },
          };
        }
        return { ...role, policy: { ...role.policy, [field]: value } };
      })
    );
  }

  async function generate() {
    setStatus(null);
    setResult(null);
    if (!startupSlug) {
      setStatus('Startup name is required.');
      return;
    }
    if (roles.length < 1) {
      setStatus('Add at least one role.');
      return;
    }

    setRunning(true);
    try {
      const res = await fetch('/api/startup-agent-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupName: startupSlug, roles }),
      });
      const data = (await res.json()) as GeneratorApiResponse;
      if (!res.ok || !data.ok) {
        setStatus(data.error || 'Generation failed.');
        return;
      }
      setResult(data);
      setStatus(`Generated ${data.roles ?? roles.length} startup agents.`);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Generation failed.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="font-sans space-y-6">
      <div className="glass-strong p-6 rounded-2xl">
        <h2 className="modern-typography-medium gradient-text mb-2">Startup Agent Generator</h2>
        <p className="text-sm text-muted mb-4">
          Generate role-based delegate EOAs, Prism context wallets, ENS subdomain payloads, optional ERC-8004 registration, and
          audit artifacts for startup swarms.
        </p>
        <label className="block text-xs text-muted mb-1">Startup name</label>
        <input
          value={startupName}
          onChange={(e) => setStartupName(e.target.value)}
          placeholder="acme-robotics"
          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent smooth-transition mb-4"
        />
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-muted mb-1">Role template</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as StartupRoleTemplate)}
              className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          {selectedRole === 'custom' && (
            <div>
              <label className="block text-xs text-muted mb-1">Custom role</label>
              <input
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="growth-agent"
                className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
              />
            </div>
          )}
          <button type="button" className="btn-secondary text-sm" onClick={addRole}>
            Add role
          </button>
        </div>
      </div>

      <div className="glass p-6 rounded-2xl space-y-4">
        <h3 className="font-semibold font-heading">Role policy config</h3>
        {roles.map((role, index) => (
          <div key={`${role.role}-${index}`} className="border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">{role.role}</p>
              <button type="button" className="text-xs text-red-300 hover:underline" onClick={() => removeRole(index)}>
                Remove
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <input
                value={role.policy.spendingLimit}
                onChange={(e) => updatePolicy(index, 'spendingLimit', e.target.value)}
                placeholder="spendingLimit (wei)"
                className="bg-surface border border-border rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={role.policy.dailyLimit}
                onChange={(e) => updatePolicy(index, 'dailyLimit', e.target.value)}
                placeholder="dailyLimit (wei)"
                className="bg-surface border border-border rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={String(role.policy.ttl)}
                onChange={(e) => updatePolicy(index, 'ttl', e.target.value)}
                placeholder="ttl (seconds)"
                className="bg-surface border border-border rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={role.policy.allowlist.join(',')}
                onChange={(e) => updatePolicy(index, 'allowlist', e.target.value)}
                placeholder="allowlist comma-separated"
                className="bg-surface border border-border rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}
        <button type="button" className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => void generate()} disabled={running}>
          {running ? 'Generating...' : 'Generate startup swarm'}
        </button>
        {status ? <p className="text-xs text-muted">{status}</p> : null}
      </div>

      {result?.roleMatrix?.length ? (
        <div className="glass p-6 rounded-2xl space-y-3">
          <h3 className="font-semibold font-heading">Role matrix</h3>
          <p className="text-xs text-muted">
            Artifact: <code>{result.output}</code>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Delegate EOA</th>
                  <th className="py-2 pr-4">Context Wallet</th>
                  <th className="py-2 pr-4">ENS</th>
                  <th className="py-2 pr-4">8004</th>
                  <th className="py-2 pr-4">Tx Hashes</th>
                </tr>
              </thead>
              <tbody>
                {result.roleMatrix.map((row) => (
                  <tr key={`${row.role}-${row.delegateEoa}`} className="border-t border-white/10">
                    <td className="py-2 pr-4 text-white">{row.role}</td>
                    <td className="py-2 pr-4 font-mono">{row.delegateEoa}</td>
                    <td className="py-2 pr-4 font-mono">{row.contextWallet}</td>
                    <td className="py-2 pr-4">{row.ens || '-'}</td>
                    <td className="py-2 pr-4">{row.erc8004}</td>
                    <td className="py-2 pr-4">
                      <code>{Object.values(row.txHashes || {}).filter(Boolean).slice(0, 3).join(', ') || 'simulated/none'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
