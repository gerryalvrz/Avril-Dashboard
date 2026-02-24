'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type WaaPContextType = {
  address: string | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const WaaPContext = createContext<WaaPContextType>({
  address: null,
  isReady: false,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

const OWNER_WALLET = (process.env.NEXT_PUBLIC_OWNER_WALLET || '').toLowerCase();

function authMessage(nonce: string) {
  return `AgentDashboard auth nonce: ${nonce}`;
}

async function establishOwnerSession(address: string) {
  const nonceRes = await fetch('/api/auth/nonce', { method: 'GET', cache: 'no-store' });
  if (!nonceRes.ok) return false;

  const { nonce } = (await nonceRes.json()) as { nonce?: string };
  if (!nonce) return false;

  const message = authMessage(nonce);
  const signature = await window.waap?.request?.({
    method: 'personal_sign',
    params: [message, address],
  });

  if (!signature || typeof signature !== 'string') return false;

  const sessionRes = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature }),
  });

  return sessionRes.ok;
}

export function useWaaP() {
  return useContext(WaaPContext);
}

export default function WaaPProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const { initWaaP } = await import('@human.tech/waap-sdk');

        initWaaP({
          config: {
            authenticationMethods: ['wallet', 'social'],
            allowedSocials: ['google'],
            styles: { darkMode: false },
          },
          project: {
            name: 'AgentMotus',
            logo: process.env.NEXT_PUBLIC_WAAP_LOGO || '',
          },
          useStaging: false,
        } as any);

        const accounts = await window.waap?.request?.({ method: 'eth_requestAccounts' });
        if (!mounted) return;
        const addr = Array.isArray(accounts) ? accounts[0] : null;

        if (!addr) {
          setAddress(null);
          return;
        }

        const normalized = String(addr).toLowerCase();
        if (OWNER_WALLET && normalized !== OWNER_WALLET) {
          setAddress(normalized);
          return;
        }

        const check = await fetch('/api/auth/session', { method: 'GET', cache: 'no-store' });
        const hasSession = check.ok && ((await check.json()) as { ok?: boolean }).ok;

        if (!hasSession) {
          const sessionOk = await establishOwnerSession(normalized);
          if (!sessionOk) {
            setAddress(null);
            return;
          }
        }

        setAddress(normalized);
      } catch {
        if (mounted) setAddress(null);
      } finally {
        if (mounted) setIsReady(true);
      }
    }

    void boot();

    const onAccountsChanged = (accounts: string[]) => {
      const addr = Array.isArray(accounts) ? accounts[0] : null;
      setAddress(addr ? String(addr).toLowerCase() : null);
    };

    window.waap?.on?.('accountsChanged', onAccountsChanged);

    return () => {
      mounted = false;
      window.waap?.removeListener?.('accountsChanged', onAccountsChanged);
    };
  }, []);

  const ctx = useMemo<WaaPContextType>(() => {
    const normalized = (address || '').toLowerCase();
    const isAuthenticated = !!normalized && (!!OWNER_WALLET ? normalized === OWNER_WALLET : true);

    return {
      address,
      isReady,
      isAuthenticated,
      login: async () => {
        await window.waap?.login?.();
        const accounts = await window.waap?.request?.({ method: 'eth_requestAccounts' });
        const addr = Array.isArray(accounts) ? String(accounts[0] || '').toLowerCase() : '';

        if (!addr) {
          setAddress(null);
          return;
        }

        if (OWNER_WALLET && addr !== OWNER_WALLET) {
          setAddress(addr);
          return;
        }

        const ok = await establishOwnerSession(addr);
        if (!ok) {
          await window.waap?.logout?.();
          setAddress(null);
          return;
        }

        setAddress(addr);
      },
      logout: async () => {
        await fetch('/api/auth/session', { method: 'DELETE' });
        await window.waap?.logout?.();
        setAddress(null);
      },
    };
  }, [address, isReady]);

  return <WaaPContext.Provider value={ctx}>{children}</WaaPContext.Provider>;
}
