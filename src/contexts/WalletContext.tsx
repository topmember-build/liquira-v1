/**
 * Wallet provider backed by wagmi v2.
 * Supports:
 *  - Injected wallets (MetaMask, Rabby, Coinbase Wallet, etc.) via window.ethereum
 *  - WalletConnect v2 (when VITE_WALLETCONNECT_PROJECT_ID is set)
 *
 * Exposes the same API as the previous stub so existing components keep working.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  WagmiProvider,
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { supabase } from "@/integrations/supabase/client";
import { wagmiConfig, CHAIN_ID_MAP, CHAIN_ID_REVERSE, HAS_WALLETCONNECT } from "@/lib/wagmi";
import { CHAINS, STABLES } from "@/lib/stables";
import { ARC_CONTRACTS, ERC20_TRANSFER_ABI, arcTestnet } from "@/lib/arc-testnet";

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
  disconnect: () => void;
  switchChain: (chainId: string) => Promise<void>;
  refreshBalances: () => Promise<void>;
  hasWalletConnect: boolean;
  isConnected: boolean;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InnerWalletProvider>{children}</InnerWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function fakeStableBalances(seed: string): Record<string, number> {
  // We don't have on-chain stable balances without contract reads.
  // Show deterministic placeholder amounts derived from the address so the UI looks alive.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const bal: Record<string, number> = {};
  STABLES.forEach((s, i) => {
    const v = Math.abs((h >> (i % 5)) % 1_000_000) / 100;
    bal[s.symbol] = Math.round(v * 100) / 100;
  });
  return bal;
}

function InnerWalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, connector } = useAccount();
  const evmChainId = useChainId();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: nativeBal, refetch: refetchNativeBalance } = useBalance({ address });

  const [eurcBalance, setEurcBalance] = useState<number>(0);
  const [cirBTCBalance, setCircBTCBalance] = useState<number>(0);

  // Fetch token balances directly using viem public client
  const fetchTokenBalances = useCallback(async (userAddress: string) => {
    if (!userAddress) {
      setEurcBalance(0);
      setCircBTCBalance(0);
      return;
    }

    try {
      const publicClient = createPublicClient({
        chain: arcTestnet,
        transport: http("https://rpc.testnet.arc.network"),
      });

      // Fetch EURC balance
      const eurcData = await publicClient.readContract({
        address: ARC_CONTRACTS.EURC,
        abi: ERC20_TRANSFER_ABI,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`],
      });
      setEurcBalance(Number(eurcData) / 1e6);

      // Fetch cirBTC balance
      const cirBTCData = await publicClient.readContract({
        address: ARC_CONTRACTS.cirBTC,
        abi: ERC20_TRANSFER_ABI,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`],
      });
      setCircBTCBalance(Number(cirBTCData) / 1e8);

      console.log("[WalletContext] Token balances fetched:", {
        address: userAddress,
        EURC: Number(eurcData) / 1e6,
        cirBTC: Number(cirBTCData) / 1e8,
      });
    } catch (err) {
      console.warn("[WalletContext] Failed to fetch token balances:", err);
      setEurcBalance(0);
      setCircBTCBalance(0);
    }
  }, []);

  const refreshBalances = useCallback(async () => {
    try {
      await refetchNativeBalance?.();
      if (address && isConnected) {
        await fetchTokenBalances(address);
      }
    } catch (e) {
      console.warn("[wallet] refreshBalances failed", e);
    }
  }, [refetchNativeBalance, address, isConnected, fetchTokenBalances]);

  // Refetch balances when address changes
  useEffect(() => {
    if (address && isConnected) {
      void fetchTokenBalances(address);
    } else {
      setEurcBalance(0);
      setCircBTCBalance(0);
    }
  }, [address, isConnected, fetchTokenBalances]);

  useEffect(() => {
    if (!address || !isConnected || !supabase?.channel) return;

    const normalizedAddress = address.toLowerCase();

    const refreshIfRelated = async (payload: any) => {
      const row = payload.new ?? payload.old;
      if (!row) return;

      const check = (value: unknown) =>
        typeof value === "string" && value.toLowerCase() === normalizedAddress;

      if (
        check(row.user_id) ||
        check(row.wallet_address) ||
        check(row.recipient_address) ||
        check(row.destination_address) ||
        check(row.source_address)
      ) {
        void refreshBalances();
      }
    };

    try {
      const channel = supabase
        .channel(`wallet-balance:${normalizedAddress}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "fx_transactions",
          },
          refreshIfRelated,
        )
        .subscribe();

      const intervalId = window.setInterval(() => {
        void refreshBalances();
      }, 30_000);

      return () => {
        void supabase.removeChannel(channel);
        window.clearInterval(intervalId);
      };
    } catch (err) {
      console.warn("[WalletContext] Failed to setup live wallet balance refresh:", err);
    }
  }, [address, isConnected, refreshBalances]);

  // Map wagmi connector id → our WalletKind
  const kind: WalletKind | null = useMemo(() => {
    if (!connector) return null;
    if (connector.id === "walletConnect") return "walletconnect";
    return "injected";
  }, [connector]);

  const chainId = evmChainId ? CHAIN_ID_REVERSE[evmChainId] ?? String(evmChainId) : "arc-testnet";

  const balances = useMemo(() => {
    const nativeAmount = nativeBal ? Number(nativeBal.formatted) : 0;
    return {
      USDC: nativeAmount,
      EURC: eurcBalance,
      cirBTC: cirBTCBalance,
    };
  }, [nativeBal, eurcBalance, cirBTCBalance]);

  const connect = useCallback(
    async (k: WalletKind) => {
      const targetId = k === "walletconnect" ? "walletConnect" : "injected";
      const c = connectors.find((cc) => cc.id === targetId);
      if (!c) {
        throw new Error(
          k === "injected"
            ? "No browser wallet detected. Install MetaMask, Rabby, or Coinbase Wallet."
            : "WalletConnect is not configured. Add VITE_WALLETCONNECT_PROJECT_ID in project settings.",
        );
      }
      try {
        await connectAsync({ connector: c });
      } catch (e) {
        console.warn("[wallet] connect failed", e);
        throw e instanceof Error ? e : new Error("Failed to connect wallet.");
      }
    },
    [connectors, connectAsync],
  );

  const disconnect = useCallback(async () => {
    try {
      if (typeof disconnectAsync === "function") {
        await disconnectAsync();
        return;
      }
      if (connector && typeof connector.disconnect === "function") {
        await connector.disconnect();
        return;
      }
      console.warn("[wallet] disconnect unavailable - no disconnect function found");
    } catch (error) {
      console.warn("[wallet] disconnect failed", error);
    }
  }, [disconnectAsync, connector]);

  const switchChain = useCallback(
    async (id: string) => {
      const target = CHAIN_ID_MAP[id];
      if (!target || !CHAINS.find((c) => c.id === id)) return;
      try {
        await switchChainAsync({ chainId: target });
      } catch (e) {
        console.warn("[wallet] switchChain failed", e);
      }
    },
    [switchChainAsync],
  );

  // Persist last connection so reload reuses session (wagmi already does this for injected).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isConnected && address) {
      window.localStorage.setItem("liquira:lastAddress", address);
    }
  }, [isConnected, address]);

  const value = useMemo<WalletContextValue>(
    () => ({
      connected: isConnected,
      isConnected,
      address: address ?? null,
      ensName: null,
      chainId,
      kind,
      balances,
      nativeBalance: nativeBal
        ? `${Number(nativeBal.formatted).toFixed(4)} ${nativeBal.symbol}`
        : null,
      isConnecting: isPending,
      connect,
      disconnect,
      switchChain,
      refreshBalances,
      hasWalletConnect: HAS_WALLETCONNECT,
    }),
    [
      isConnected,
      address,
      chainId,
      kind,
      balances,
      nativeBal,
      isPending,
      connect,
      disconnect,
      switchChain,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
