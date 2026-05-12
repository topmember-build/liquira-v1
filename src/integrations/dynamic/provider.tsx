/**
 * Dynamic Labs Provider for embedded wallet support.
 * Provides authentication and wallet functionality on Arc testnet.
 */

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
// import { ViemExtension } from "@dynamic-labs/viem-extension";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface DynamicProviderProps {
  children: ReactNode;
}

export function DynamicProvider({ children }: DynamicProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const environmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;

  if (!environmentId) {
    throw new Error(
      "Missing VITE_DYNAMIC_ENVIRONMENT_ID environment variable. " +
      "Get it from https://app.dynamic.xyz and add to .env"
    );
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
          walletConnectors: [EthereumWalletConnectors],
          // extensions: [new ViemExtension()],
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
