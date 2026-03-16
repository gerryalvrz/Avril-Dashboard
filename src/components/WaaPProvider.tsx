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

export function useWaaP() {
  return useContext(WaaPContext);
}

export default function WaaPProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

  useEffect(() => {
    let mounted = true;
    let removeListener: (() => void) | undefined;

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
          walletConnectProjectId: walletConnectProjectId || undefined,
        } as any);

        // Attach listener only after SDK is initialized (window.waap is now set)
        const onAccountsChanged = (accounts: string[]) => {
          const addr = Array.isArray(accounts) ? accounts[0] : null;
          setAddress(addr ? String(addr).toLowerCase() : null);
        };
        window.waap?.on?.('accountsChanged', onAccountsChanged);
        removeListener = () => window.waap?.removeListener?.('accountsChanged', onAccountsChanged);

        // Do NOT call eth_requestAccounts automatically here.
        // The SDK's auto-connect falls back to window.ethereum.request() without
        // optional chaining; if window.ethereum is broken (e.g. evmAsk.js conflict),
        // this throws an uncaught "t is not a function". Let the user connect manually.
      } catch {
        if (mounted) setAddress(null);
      } finally {
        if (mounted) setIsReady(true);
      }
    }

    void boot();

    return () => {
      mounted = false;
      removeListener?.();
    };
  }, []);

  const ctx = useMemo<WaaPContextType>(() => {
    const normalized = (address || '').toLowerCase();
    const isAuthenticated = !!normalized;

    return {
      address,
      isReady,
      isAuthenticated,
      login: async () => {
        try {
          await window.waap?.login?.();

          // Try to read accounts from WaaP first; fall back to window.ethereum if needed.
          let accounts: unknown;
          try {
            accounts = await window.waap?.request?.({ method: 'eth_requestAccounts' });
          } catch {
            accounts = await (window as any)?.ethereum?.request?.({ method: 'eth_requestAccounts' });
          }

          const addr = Array.isArray(accounts) ? String(accounts[0] || '').toLowerCase() : '';

          if (!addr) {
            // If we couldn't read the account here, rely on the WaaP accountsChanged event.
            return;
          }

          setAddress(addr);
        } catch {
          setAddress(null);
        }
      },
      logout: async () => {
        await window.waap?.logout?.();
        setAddress(null);
      },
    };
  }, [address, isReady]);

  return <WaaPContext.Provider value={ctx}>{children}</WaaPContext.Provider>;
}
