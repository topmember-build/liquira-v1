/**
 * Hook for real-time transaction updates via Supabase Realtime.
 * Subscribes to fx_transactions table changes for the connected wallet/user.
 */

import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TransactionStatus } from "./useBackendAPI";

export function useRealtimeTransactions(
  userId?: string,
  walletAddress?: string,
  onTransactionUpdate?: (updatedTx: TransactionStatus) => void
) {
  useEffect(() => {
    if (!userId && !walletAddress) return;

    // Generate a unique channel name to avoid conflicts
    const channelName = `fx_transactions_${userId || walletAddress}`;

    try {
      const normalizedUserId = userId && userId.startsWith("0x") && userId.length === 42
        ? userId.toLowerCase()
        : userId;
      const normalizedWalletAddress = walletAddress && walletAddress.startsWith("0x") && walletAddress.length === 42
        ? walletAddress.toLowerCase()
        : walletAddress;

      // Set up realtime subscription for the fx_transactions table
      const channel = supabase
        .channel(channelName, { config: { broadcast: { self: false } } })
        .on(
          "postgres_changes",
          {
            event: "*", // Subscribe to INSERT, UPDATE, DELETE
            schema: "public",
            table: "fx_transactions",
            filter: normalizedUserId
              ? `user_id=eq.${normalizedUserId}`
              : normalizedWalletAddress
                ? `user_id=eq.${normalizedWalletAddress}`
                : undefined,
          },
          (payload: any) => {
            console.log("[Realtime] Transaction change received:", payload.eventType);

            if (!payload.new) return;

            const record = payload.new as Record<string, unknown>;

            // Map database record to TransactionStatus
            const updatedTx: TransactionStatus = {
              id: (record.transaction_id as string) || "",
              status: (record.status as TransactionStatus["status"]) || "pending",
              sourceChain: "arc-testnet",
              destinationChain: "arc-testnet",
              sourceToken: (record.from_currency as string) || "",
              destinationToken: (record.to_currency as string) || "",
              sourceAmount: String(record.from_amount ?? 0),
              destinationAmount: String(record.to_amount ?? 0),
              estimatedOutput: String(record.to_amount ?? 0),
              provider: "Liquira FX",
              txHash: (record.arc_tx_hash as string) || (record.circle_transfer_id as string),
              explorerUrl: buildExplorerUrl((record.arc_tx_hash as string) || (record.circle_transfer_id as string)),
              errorMessage: (record.error_message as string) || undefined,
              createdAt: (record.created_at as string) || new Date().toISOString(),
              updatedAt: (record.updated_at as string) || new Date().toISOString(),
            };

            onTransactionUpdate?.(updatedTx);
          }
        )
        .subscribe((status: any) => {
          if (status === "SUBSCRIBED") {
            console.log(`[Realtime] Subscribed to ${channelName}`);
          } else if (status === "CLOSED") {
            console.log(`[Realtime] Closed ${channelName}`);
          }
        });

      return () => {
        // Use supabase.removeChannel to fully remove the channel and its callbacks.
        try {
          void supabase.removeChannel(channel);
        } catch (err) {
          // Fallback to unsubscribe if removeChannel is not available in this runtime
          try {
            channel.unsubscribe();
          } catch (_) {
            /* ignore */
          }
        }
      };
    } catch (error) {
      console.warn("[Realtime] Subscription setup failed:", error instanceof Error ? error.message : String(error));
    }
  }, [userId, walletAddress, onTransactionUpdate]);
}

function buildExplorerUrl(txHash?: string | null): string | undefined {
  if (!txHash) return undefined;
  return `https://testnet.arcscan.app/tx/${txHash}`;
}
