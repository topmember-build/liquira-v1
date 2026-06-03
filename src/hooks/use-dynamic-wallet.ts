/**
 * Hook to access Dynamic embedded wallet context safely.
 * On SSR or while Dynamic is still initializing, this returns a safe fallback.
 */

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useDynamicReady } from "@/integrations/dynamic/provider";

type DynamicWalletContext = {
  user?: unknown;
  primaryWallet?: { address?: string; chain?: string; connector?: unknown } | null;
  sdkHasLoaded?: boolean;
  setShowAuthFlow?: ((show: boolean) => void) | undefined;
  handleLogOut?: (() => Promise<void>) | undefined;
  [key: string]: unknown;
};

const DEFAULT_DYNAMIC_CONTEXT: DynamicWalletContext = {
  user: null,
  primaryWallet: null,
  sdkHasLoaded: false,
};

export function useDynamicWallet(): DynamicWalletContext {
  const { sdkReady } = useDynamicReady();
  if (!sdkReady || typeof window === "undefined") {
    return DEFAULT_DYNAMIC_CONTEXT;
  }

  try {
    return useDynamicContext();
  } catch (error) {
    console.warn("[useDynamicWallet] Dynamic context unavailable:", error);
    return DEFAULT_DYNAMIC_CONTEXT;
  }
}
