import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClientOnlyFn } from "@tanstack/start-client-core";

export type WalletKind = "injected" | "walletconnect";

export type WalletState = {
  connected: boolean;
  address: string | null;
  ensName: string | null;
  chainId: string;
  kind: WalletKind | null;
  balances: Record<string, number>;
  nativeBalance: string | null;
  isConnecting: boolean;
};

type WalletContextValue = WalletState & {
  connect: (kind: WalletKind) => Promise<void>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: string) => Promise<void>;
  refreshBalances: () => Promise<void>;
  hasWalletConnect: boolean;
  isConnected: boolean;
};

export const WalletContext = createContext<WalletContextValue | null>(null);

const fallbackValue: WalletContextValue = {
  connected: false,
  isConnected: false,
  address: null,
  ensName: null,
  chainId: "arc-testnet",
  kind: null,
  balances: {
    USDC: 0,
    EURC: 0,
    cirBTC: 0,
  },
  nativeBalance: null,
  isConnecting: false,
  connect: async () => {
    throw new Error("Wallet provider is not loaded yet.");
  },
  disconnect: async () => {},
  switchChain: async () => {},
  refreshBalances: async () => {},
  hasWalletConnect: false,
};

const loadWalletProvider = createClientOnlyFn(async () => {
  const module = await import("./WalletProviders.client");
  return module.WalletProvider;
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [LoadedProvider, setLoadedProvider] = useState<React.ComponentType<{ children: ReactNode }> | null>(null);

  useEffect(() => {
    if (!loadWalletProvider) return;

    void loadWalletProvider()
      .then((Provider) => {
        if (Provider) setLoadedProvider(() => Provider);
      })
      .catch((error) => {
        console.error("Failed to load WalletProvider client module:", error);
      });
  }, []);

  if (!LoadedProvider) {
    return <WalletContext.Provider value={fallbackValue}>{children}</WalletContext.Provider>;
  }

  return <LoadedProvider>{children}</LoadedProvider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
