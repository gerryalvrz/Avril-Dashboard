export type StartupRoleTemplate = 'ceo-agent' | 'sales-agent' | 'support-agent' | 'research-agent' | 'ops-agent' | 'custom';

export type StartupRolePolicy = {
  spendingLimit: string;
  dailyLimit: string;
  ttl: number;
  allowlist: string[];
};

export type StartupRoleInput = {
  role: string;
  policy: StartupRolePolicy;
};

export const DEFAULT_ROLE_POLICIES: Record<Exclude<StartupRoleTemplate, 'custom'>, StartupRolePolicy> = {
  'ceo-agent': { spendingLimit: '10000000000000000', dailyLimit: '30000000000000000', ttl: 172800, allowlist: [] },
  'sales-agent': { spendingLimit: '5000000000000000', dailyLimit: '15000000000000000', ttl: 86400, allowlist: [] },
  'support-agent': { spendingLimit: '1000000000000000', dailyLimit: '5000000000000000', ttl: 86400, allowlist: [] },
  'research-agent': { spendingLimit: '3000000000000000', dailyLimit: '10000000000000000', ttl: 86400, allowlist: [] },
  'ops-agent': { spendingLimit: '7000000000000000', dailyLimit: '20000000000000000', ttl: 172800, allowlist: [] },
};

export function sanitizeStartupName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function buildDefaultRoleInput(role: Exclude<StartupRoleTemplate, 'custom'>): StartupRoleInput {
  return {
    role,
    policy: { ...DEFAULT_ROLE_POLICIES[role], allowlist: [...DEFAULT_ROLE_POLICIES[role].allowlist] },
  };
}
