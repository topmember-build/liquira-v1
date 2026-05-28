import { list_transactions, update_status } from "@/server/transaction-service.server";
import { verify_arc_transfer } from "@/server/arc-settlement.server";

const POLL_INTERVAL_MS = Number(process.env.TX_STATUS_POLL_MS || 30_000);
const MAX_BATCH = 50;

async function checkPendingBatch() {
  try {
    const pending = await list_transactions({ status: "pending", limit: MAX_BATCH, offset: 0 });

    for (const tx of pending) {
      if (!tx.arcTxHash) continue;

      try {
        const confirmed = await verify_arc_transfer(tx.arcTxHash);
        if (confirmed) {
          await update_status(tx.transactionId, "success", { verifiedOnChain: true });
          console.log("[TX Updater] Marked confirmed:", tx.transactionId, tx.arcTxHash);
        } else {
          // still pending on-chain
        }
      } catch (err) {
        console.warn("[TX Updater] verify failure for", tx.transactionId, err instanceof Error ? err.message : String(err));
      }
    }
  } catch (err) {
    console.warn("[TX Updater] Failed to fetch pending transactions:", err instanceof Error ? err.message : String(err));
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startTxStatusUpdater() {
  if (intervalHandle) return;
  // Run immediately once, then poll on interval
  checkPendingBatch().catch((e) => console.warn("[TX Updater] initial run failed:", e));
  intervalHandle = setInterval(() => {
    checkPendingBatch().catch((e) => console.warn("[TX Updater] poll failed:", e));
  }, POLL_INTERVAL_MS);
  console.log(`[TX Updater] Started (interval ${POLL_INTERVAL_MS}ms)`);
}

// Auto-start when module is imported on server boot
try {
  startTxStatusUpdater();
} catch (e) {
  console.warn("[TX Updater] Failed to auto-start:", e instanceof Error ? e.message : String(e));
}
