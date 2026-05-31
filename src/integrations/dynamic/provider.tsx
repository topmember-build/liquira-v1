/**
 * Dynamic Labs Provider for embedded wallet support.
 * Provides authentication and wallet functionality on Arc testnet.
 */

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
// import { ViemExtension } from "@dynamic-labs/viem-extension";
import type { EvmNetwork, GenericNetwork } from "@dynamic-labs/types";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { arcTestnet } from "@/lib/arc-testnet";

interface DynamicProviderProps {
  children: ReactNode;
}

export function DynamicProvider({ children }: DynamicProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Support both VITE_ prefixed env and plain DYNAMIC_ENVIRONMENT_ID.
  // Use static `import.meta.env.*` accesses so Vite can statically replace
  // values during dev SSR. Fall back to `process.env` when not provided.
  const metaVite = (import.meta as any).env?.VITE_DYNAMIC_ENVIRONMENT_ID as string | undefined;
  const metaPlain = (import.meta as any).env?.DYNAMIC_ENVIRONMENT_ID as string | undefined;
  const environmentId =
    metaVite ?? metaPlain ?? (typeof process !== "undefined" ? (process.env as any).VITE_DYNAMIC_ENVIRONMENT_ID ?? (process.env as any).DYNAMIC_ENVIRONMENT_ID : undefined);

  const arcTestnetNetwork: EvmNetwork = {
    key: "arc-testnet",
    name: "Arc Testnet",
    chainId: arcTestnet.id,
    networkId: arcTestnet.id,
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
    rpcUrls: ["https://rpc.testnet.arc.network"],
    blockExplorerUrls: ["https://testnet.arcscan.app"],
    iconUrls: ["https://testnet.arcscan.app/favicon.ico"],
    isTestnet: true,
    hasNativeToken: true,
    supportsFeeTokenSelection: true,
  };

  const arcNetworkOverrides = useMemo(
    () =>
      (dashboardNetworks: GenericNetwork[]) => {
        const found = dashboardNetworks.some((network) => Number(network.networkId) === arcTestnet.id);
        return found ? dashboardNetworks : [...dashboardNetworks, arcTestnetNetwork];
      },
    []
  );

  if (!environmentId) {
    console.warn(
      "Missing Dynamic environment variable. Dynamic Labs wallet support will be disabled. " +
        "Set VITE_DYNAMIC_ENVIRONMENT_ID or DYNAMIC_ENVIRONMENT_ID (in .env.local) to enable it."
    );
    return <>{children}</>;
  }

  // Only render on client to avoid SSR issues with ViemExtension
  if (!isClient) {
    return <>{children}</>;
  }

  try {
    return (
      <DynamicContextProvider
        settings={{
          environmentId,
          flowNetwork: "testnet",
          walletConnectors: [EthereumWalletConnectors],
          walletConnectPreferredChains: [`eip155:${arcTestnet.id}`],
          // extensions: [new ViemExtension()],
          overrides: {
            evmNetworks: arcNetworkOverrides,
          },
        }}
      >
        {children}
      </DynamicContextProvider>
    );
  } catch (error) {
    console.error("[DynamicProvider] Error initializing Dynamic:", error);
    // Fallback: render children without Dynamic provider
    return <>{children}</>;
  }
}
