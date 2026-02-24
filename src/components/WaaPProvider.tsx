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
        setAddress(addr || null);
      } catch {
        if (mounted) setAddress(null);
      } finally {
        if (mounted) setIsReady(true);
      }
    }

    void boot();

    const onAccountsChanged = (accounts: string[]) => {
      const addr = Array.isArray(accounts) ? accounts[0] : null;
      setAddress(addr || null);
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
        const addr = Array.isArray(accounts) ? accounts[0] : null;
        setAddress(addr || null);
      },
      logout: async () => {
        await window.waap?.logout?.();
        setAddress(null);
      },
    };
  }, [address, isReady]);

  return <WaaPContext.Provider value={ctx}>{children}</WaaPContext.Provider>;
}
