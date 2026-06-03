/**
 * Example: Using Dynamic Embedded Wallets
 * 
 * This component demonstrates how to use Dynamic for embedded wallet authentication.
 * Users can connect, see their address, and sign transactions through Dynamic.
 */

import { useEffect, useState } from "react";
import { useDynamicWallet } from "@/hooks/use-dynamic-wallet";

export function DynamicWalletExample() {
  const { user, primaryWallet, sdkHasLoaded, handleLogOut } = useDynamicWallet();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    if (primaryWallet?.address) {
      navigator.clipboard.writeText(primaryWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!sdkHasLoaded) {
    return <div className="text-muted-foreground">Loading wallet...</div>;
  }

  if (!user || !primaryWallet) {
    return (
      <div className="text-sm text-muted-foreground">
        Please connect your Dynamic embedded wallet
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4">
      <div>
        <h3 className="font-semibold">Connected Wallet</h3>
        <p className="text-sm text-muted-foreground">
          {primaryWallet.connector?.name || "Embedded Wallet"}
        </p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">Address</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-surface-1 px-2 py-1 font-mono text-xs">
            {primaryWallet.address}
          </code>
          <button
            onClick={handleCopyAddress}
            className="rounded px-2 py-1 text-xs hover:bg-surface-1"
          >
            {copied ? "✓" : "Copy"}
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">Network</p>
        <p className="font-mono text-sm">
          {primaryWallet.chain || "Arc Testnet"}
        </p>
      </div>

      <button
        onClick={handleLogOut}
        className="w-full rounded border border-border px-3 py-2 text-sm hover:bg-surface-1"
      >
        Disconnect
      </button>
    </div>
  );
}
