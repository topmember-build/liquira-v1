/**
 * Hook for executing on-chain ERC20 transfer swaps on Arc Testnet (smoke-test mode).
 * Pipeline: simulate → wallet write → wait receipt → verify Transfer event.
 */
import { useCallback, useState } from "react";
import {
  usePublicClient,
  useWalletClient,
  useAccount,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  ARC_CONTRACTS,
  TREASURY_ADDRESS,
  ERC20_TRANSFER_ABI,
  TRANSFER_EVENT_TOPIC,
  arcTestnet,
} from "@/lib/arc-testnet";

export type SwapPhase =
  | "idle"
  | "switching-chain"
  | "simulating"
  | "awaiting-wallet"
  | "pending"
  | "confirming"
  | "confirmed"
  | "failed";

export type OnchainSwapResult = {
  txHash: string;
  explorerUrl: string;
  status: "success" | "reverted";
  gasUsed: bigint;
  transferVerified: boolean;
};

export function useOnchainSwap() {
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnchainSwapResult | null>(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const execute = useCallback(
    async (amountUsdc: number) => {
      setError(null);
      setResult(null);

      if (!isConnected || !address || !walletClient || !publicClient) {
        setError("Connect your wallet first");
        return null;
      }

      try {
        // 1. Ensure we're on Arc Testnet
        if (chainId !== arcTestnet.id) {
          setPhase("switching-chain");
          try {
            await switchChainAsync({ chainId: arcTestnet.id });
          } catch {
            setError("Please switch to Arc Testnet in your wallet");
            setPhase("failed");
            return null;
          }
        }

        // 2. Simulate
        setPhase("simulating");
        const amount = parseUnits(String(amountUsdc), 6);

        const simulation = await publicClient.simulateContract({
          address: ARC_CONTRACTS.USDC,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          account: address,
          args: [TREASURY_ADDRESS, amount],
        });

        // 3. Write transaction
        setPhase("awaiting-wallet");
        const hash = await walletClient.writeContract(simulation.request);

        // 4. Wait for receipt
        setPhase("pending");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 60_000,
        });

        // 5. Verify Transfer event
        setPhase("confirming");
        const transferVerified = receipt.logs.some(
          (log) =>
            log.topics[0]?.toLowerCase() === TRANSFER_EVENT_TOPIC.toLowerCase(),
        );

        const explorerUrl = `https://testnet.arcscan.app/tx/${hash}`;
        const swapResult: OnchainSwapResult = {
          txHash: hash,
          explorerUrl,
          status: receipt.status === "success" ? "success" : "reverted",
          gasUsed: receipt.gasUsed,
          transferVerified,
        };

        setResult(swapResult);
        setPhase(receipt.status === "success" ? "confirmed" : "failed");

        if (receipt.status !== "success") {
          setError("Transaction reverted on-chain");
        }

        return swapResult;
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "On-chain swap failed";
        // User rejected
        if (msg.includes("User rejected") || msg.includes("denied")) {
          setError("Transaction rejected by user");
        } else {
          setError(msg.length > 120 ? msg.slice(0, 120) + "…" : msg);
        }
        setPhase("failed");
        return null;
      }
    },
    [isConnected, address, walletClient, publicClient, chainId, switchChainAsync],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setResult(null);
  }, []);

  const usdcBalance = useCallback(async () => {
    if (!publicClient || !address) return null;
    try {
      const bal = await publicClient.readContract({
        address: ARC_CONTRACTS.USDC,
        abi: ERC20_TRANSFER_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      return Number(formatUnits(bal as bigint, 6));
    } catch {
      return null;
    }
  }, [publicClient, address]);

  return { phase, error, result, execute, reset, usdcBalance };
}
