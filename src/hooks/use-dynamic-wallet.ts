/**
 * Hook to access Dynamic embedded wallet context.
 * Provides user authentication and wallet connection state.
 */

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export function useDynamicWallet() {
  return useDynamicContext();
}
