import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { X } from "lucide-react";
import TokenIcon from "@/lib/token-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactionHistory, TransactionStatus } from "@/hooks/useBackendAPI";
import { useRealtimeTransactions } from "@/hooks/useRealtimeTransactions";

const STATUS_STYLES: Record<string, string> = {
  success: "text-primary border-primary/40 bg-primary/10",
  confirmed: "text-primary border-primary/40 bg-primary/10",
  completed: "text-primary border-primary/40 bg-primary/10",
  pending: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  failed: "text-destructive border-destructive/40 bg-destructive/10",
  queued: "text-muted-foreground border-border bg-surface-1",
  quoting: "text-muted-foreground border-border bg-surface-1",
};

export function TransactionHistoryTable() {
  const { user } = useAuth();
  const { address: walletAddress } = useAccount();
  const { transactions, loading, error, fetchHistory } = useTransactionHistory();
  const [displayTransactions, setDisplayTransactions] = useState<TransactionStatus[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "success" | "failed">("all");
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionStatus | null>(null);

  // Sync fetched transactions to display state
  useEffect(() => {
    setDisplayTransactions(transactions);
  }, [transactions]);

  // Handle real-time transaction updates
  const handleTransactionUpdate = useCallback((updatedTx: TransactionStatus) => {
    console.log("[TransactionHistoryTable] Real-time update received:", updatedTx.id);
    setDisplayTransactions((prev) => {
      const existing = prev.findIndex((tx) => tx.id === updatedTx.id);
      if (existing >= 0) {
        // Update existing transaction
        const updated = [...prev];
        updated[existing] = { ...prev[existing], ...updatedTx };
        return updated;
      }
      // New transaction from realtime (prepend to list)
      return [updatedTx, ...prev];
    });

    // Update selected transaction details if it matches
    setSelectedTransaction((prev) => {
      if (prev?.id === updatedTx.id) {
        return { ...prev, ...updatedTx };
      }
      return prev;
    });
  }, []);

  // Subscribe to real-time updates
  useRealtimeTransactions(user?.id, walletAddress, handleTransactionUpdate);

  useEffect(() => {
    if (!user && !walletAddress) return;
    void fetchHistory(user?.id ?? undefined, walletAddress ?? undefined, 10, 0, filter !== "all" ? filter : undefined);
  }, [user?.id, walletAddress, filter, fetchHistory]);

  return (
    <section className="rounded-lg border border-border bg-surface-1 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Transaction history</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchHistory(user?.id, walletAddress ?? undefined, 10, 0, filter !== "all" ? filter : undefined)}
            className="rounded border border-border bg-surface-2 px-3 py-2 text-sm font-mono uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-foreground"
          >
            Refresh
          </button>
          <Link
            to="/account/history"
            className="rounded border border-primary bg-primary/10 px-3 py-2 text-sm font-mono uppercase tracking-widest text-primary hover:bg-primary/20"
          >
            View full history
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "pending", "success", "failed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded border px-3 py-1 text-xs uppercase tracking-widest transition ${
              filter === status
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface-1">
        <table className="min-w-full text-left text-sm font-mono">
          <thead className="bg-surface-2 text-muted-foreground text-[11px] uppercase tracking-[0.2em]">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Pair</th>
              <th className="px-4 py-3 text-right">In</th>
              <th className="px-4 py-3 text-right">Out</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">TX Hash</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-destructive">
                  {error.message}
                </td>
              </tr>
            )}
            {!loading && displayTransactions.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No Arc testnet transactions found.
                </td>
              </tr>
            )}
            {displayTransactions.map((tx) => (
              <tr key={tx.id} onClick={() => setSelectedTransaction(tx)} className="border-t border-border hover:bg-surface-2 cursor-pointer transition-colors">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(tx.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <TokenIcon symbol={tx.sourceToken} size={16} />
                    <span>{tx.sourceToken}</span>
                    <span className="text-muted-foreground">→</span>
                    <TokenIcon symbol={tx.destinationToken} size={16} />
                    <span>{tx.destinationToken}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {Number(tx.sourceAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </td>
                <td className="px-4 py-3 text-right">
                  {tx.destinationAmount ? Number(tx.destinationAmount).toLocaleString(undefined, { maximumFractionDigits: 6 }) : "-"}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {tx.estimatedOutput ? Number(tx.estimatedOutput).toFixed(4) : "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${STATUS_STYLES[tx.status] ?? STATUS_STYLES.pending}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-3 break-all text-muted-foreground">
                  {tx.txHash ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Transaction Details</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="rounded p-1 hover:bg-surface-2"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-surface-1 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Transaction ID</p>
                  <p className="mt-1 break-all font-mono text-sm">{selectedTransaction.id}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-1 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Status</p>
                  <p className="mt-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${STATUS_STYLES[selectedTransaction.status] ?? STATUS_STYLES.pending}`}>
                      {selectedTransaction.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">On-Chain Transaction</p>
                {selectedTransaction.txHash ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Transaction Hash</p>
                      <p className="break-all font-mono text-sm text-primary">{selectedTransaction.txHash}</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedTransaction.explorerUrl && (
                        <a
                          href={selectedTransaction.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 rounded border border-primary bg-primary/10 px-3 py-2 text-center text-xs font-mono uppercase tracking-widest text-primary hover:bg-primary/20 transition"
                        >
                          View on Arc Explorer ↗
                        </a>
                      )}
                      <button
                        onClick={() => {
                          if (selectedTransaction.txHash) {
                            navigator.clipboard.writeText(selectedTransaction.txHash);
                          }
                        }}
                        className="rounded border border-border bg-surface-2 px-3 py-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-foreground transition"
                      >
                        Copy Hash
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Transaction hash will appear once the transaction is confirmed on-chain.</p>
                )}
              </div>

              <div className="rounded-lg border border-border bg-surface-1 p-4">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Pair</p>
                <div className="mt-2 flex items-center gap-3">
                  <TokenIcon symbol={selectedTransaction.sourceToken} size={24} />
                  <span className="font-semibold">{selectedTransaction.sourceToken}</span>
                  <span className="text-muted-foreground">→</span>
                  <TokenIcon symbol={selectedTransaction.destinationToken} size={24} />
                  <span className="font-semibold">{selectedTransaction.destinationToken}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-surface-1 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Amount In</p>
                  <p className="mt-1 font-mono text-lg font-semibold">{Number(selectedTransaction.sourceAmount).toLocaleString(undefined, { maximumFractionDigits: 8 })}</p>
                  <p className="text-xs text-muted-foreground">{selectedTransaction.sourceToken}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-1 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Amount Out</p>
                  <p className="mt-1 font-mono text-lg font-semibold">{selectedTransaction.destinationAmount ? Number(selectedTransaction.destinationAmount).toLocaleString(undefined, { maximumFractionDigits: 8 }) : "-"}</p>
                  <p className="text-xs text-muted-foreground">{selectedTransaction.destinationToken}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-surface-1 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Rate</p>
                  <p className="mt-1 font-mono text-sm font-semibold">{selectedTransaction.estimatedOutput ? Number(selectedTransaction.estimatedOutput).toFixed(6) : "-"}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-1 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Chain</p>
                  <p className="mt-1 font-mono text-sm">{selectedTransaction.sourceChain}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-1 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Provider</p>
                  <p className="mt-1 font-mono text-sm">{selectedTransaction.provider || "Liquira FX"}</p>
                </div>
              </div>

              {selectedTransaction.errorMessage && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-destructive">Error</p>
                  <p className="mt-1 text-sm text-destructive">{selectedTransaction.errorMessage}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="rounded-lg border border-border bg-surface-1 p-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Created</p>
                  <p className="mt-1 text-sm">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-1 p-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Updated</p>
                  <p className="mt-1 text-sm">{new Date(selectedTransaction.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedTransaction(null)}
              className="mt-6 w-full rounded border border-primary bg-primary/10 py-2 font-mono text-sm uppercase tracking-widest text-primary hover:bg-primary/20"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
