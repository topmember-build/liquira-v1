/**
 * Wallet provider with two adapters:
 *   - "injected": detects window.ethereum (MetaMask/Rabby/Coinbase wallet)
 *   - "walletconnect": stub that simulates a WC v2 connection
 *
 * To wire up real WalletConnect v2, install @walletconnect/ethereum-provider
 * and replace `connectWalletConnect` with the SDK's init() + connect() flow.
 * Everything else in the app already consumes this hook.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CHAINS, STABLES } from "@/lib/stables";

export type WalletKind = "injected" | "walletconnect";

export type WalletState = {
  connected: boolean;
  address: string | null;
  ensName: string | null;
  chainId: string;
  kind: WalletKind | null;
  balances: Record<string, number>; // symbol -> amount on current chain
};

type WalletContextValue = WalletState & {
  connect: (kind: WalletKind) => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: string) => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "liquira:wallet:v1";

declare global {
  interface Window {
    ethereum?: { request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

function randomAddress(): string {
  const hex = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 40; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

function fakeBalances(seed: string): Record<string, number> {
  // deterministic per address so it doesn't reshuffle on every render
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const bal: Record<string, number> = {};
  STABLES.forEach((s, i) => {
    const v = Math.abs((h >> (i % 5)) % 1_000_000) / 100;
    bal[s.symbol] = Math.round(v * 100) / 100;
  });
  return bal;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    ensName: null,
    chainId: "base",
    kind: null,
    balances: {},
  });

  // restore last session
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<WalletState>;
      if (saved.address && saved.kind) {
        setState({
          connected: true,
          address: saved.address,
          ensName: saved.ensName ?? null,
          chainId: saved.chainId ?? "base",
          kind: saved.kind,
          balances: fakeBalances(saved.address),
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((s: WalletState) => {
    if (typeof window === "undefined") return;
    if (s.connected) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const connect = useCallback(
    async (kind: WalletKind) => {
      let address: string;
      if (kind === "injected" && typeof window !== "undefined" && window.ethereum?.request) {
        try {
          const accounts = (await window.ethereum.request({
            method: "eth_requestAccounts",
          })) as string[];
          address = accounts?.[0] ?? randomAddress();
        } catch {
          // user rejected — bail
          return;
        }
      } else {
        // WalletConnect placeholder — would open the WC v2 modal.
        await new Promise((r) => setTimeout(r, 500));
        address = randomAddress();
      }
      const ens = address.endsWith("0") || address.endsWith("a") ? "treasury.eth" : null;
      const next: WalletState = {
        connected: true,
        address,
        ensName: ens,
        chainId: state.chainId || "base",
        kind,
        balances: fakeBalances(address),
      };
      setState(next);
      persist(next);
    },
    [persist, state.chainId],
  );

  const disconnect = useCallback(() => {
    const next: WalletState = {
      connected: false,
      address: null,
      ensName: null,
      chainId: state.chainId,
      kind: null,
      balances: {},
    };
    setState(next);
    persist(next);
  }, [persist, state.chainId]);

  const switchChain = useCallback(
    async (chainId: string) => {
      if (!CHAINS.find((c) => c.id === chainId)) return;
      const next = { ...state, chainId };
      setState(next);
      persist(next);
    },
    [persist, state],
  );

  const value = useMemo<WalletContextValue>(
    () => ({ ...state, connect, disconnect, switchChain }),
    [state, connect, disconnect, switchChain],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
