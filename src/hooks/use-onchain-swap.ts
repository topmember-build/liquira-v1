/**
 * Hook for executing on-chain ERC20 transfer swaps on Arc Testnet.
 * Pipeline: estimate gas, simulate, wallet write, wait receipt, verify Transfer event.
 */
import { useCallback, useState } from "react";
import {
  usePublicClient,
  useWalletClient,
  useAccount,
  useChainId,
  useSwitchChain,
  useConfig,
} from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { parseUnits, formatUnits, formatGwei, decodeEventLog, getAddress } from "viem";
import {
  ARC_CONTRACTS,
  ERC20_TRANSFER_ABI,
  TRANSFER_EVENT_TOPIC,
  arcTestnet,
} from "@/lib/arc-testnet";
import { getTreasuryAddress } from "@/lib/treasury";

export type SwapPhase =
  | "idle"
  | "switching-chain"
  | "estimating-gas"
  | "simulating"
  | "awaiting-wallet"
  | "pending"
  | "confirming"
  | "confirmed"
  | "failed";

export type GasEstimate = {
  gasUnits: bigint;
  gasPriceWei: bigint;
  gasPriceGwei: string;
  gasCostWei: bigint;
  gasCostUsdc: number; // Arc native is USDC (6 decimals)
};

export type OnchainSwapResult = {
  txHash: string;
  explorerUrl: string;
  status: "success" | "reverted";
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  gasCostUsdc: number;
  transferVerified: boolean;
  verifiedRecipient: string | null;
  verifiedAmountUsdc: number | null;
  expectedRecipient: string;
  expectedAmountUsdc: number;
  amountMatch: boolean;
  recipientMatch: boolean;
};

export function useOnchainSwap() {
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnchainSwapResult | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [lastAmount, setLastAmount] = useState<number | null>(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  /** Estimate gas without sending a transaction. Safe to call repeatedly. */
  const estimateGas = useCallback(
    async (amountUsdc: number): Promise<GasEstimate | null> => {
      if (!isConnected || !address || !publicClient) return null;
      if (chainId !== arcTestnet.id) return null;
      try {
        const amount = parseUnits(String(amountUsdc), 6);
        const treasury = getTreasuryAddress();
        const [gasUnits, gasPriceWei] = await Promise.all([
          publicClient.estimateContractGas({
            address: ARC_CONTRACTS.USDC,
            abi: ERC20_TRANSFER_ABI,
            functionName: "transfer",
            account: address,
            args: [treasury, amount],
          }),
          publicClient.getGasPrice(),
        ]);
        const gasCostWei = gasUnits * gasPriceWei;
        const gasCostUsdc = Number(formatUnits(gasCostWei, 6));
        const est: GasEstimate = {
          gasUnits,
          gasPriceWei,
          gasPriceGwei: formatGwei(gasPriceWei),
          gasCostWei,
          gasCostUsdc,
        };
        setGasEstimate(est);
        return est;
      } catch {
        return null;
      }
    },
    [isConnected, address, publicClient, chainId],
  );

  const execute = useCallback(
    async (amountUsdc: number) => {
      setError(null);
      setResult(null);
      setLastAmount(amountUsdc);

      if (!isConnected || !address || !walletClient || !publicClient) {
        setError("Connect your wallet first");
        setPhase("failed");
        return null;
      }

      const treasury = getTreasuryAddress();

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

        // 2. Estimate gas (best-effort; non-fatal)
        setPhase("estimating-gas");
        await estimateGas(amountUsdc);

        // 3. Simulate
        setPhase("simulating");
        const amount = parseUnits(String(amountUsdc), 6);

        const simulation = await publicClient.simulateContract({
          address: ARC_CONTRACTS.USDC,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          account: address,
          args: [treasury, amount],
        });

        // 4. Write transaction
        setPhase("awaiting-wallet");
        const hash = await walletClient.writeContract(simulation.request);

        // 5. Wait for receipt
        setPhase("pending");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 60_000,
        });

        // 6. Verify Transfer event — match recipient AND amount
        setPhase("confirming");
        let verifiedRecipient: string | null = null;
        let verifiedAmountUsdc: number | null = null;
        let transferVerified = false;
        let recipientMatch = false;
        let amountMatch = false;

        for (const log of receipt.logs) {
          if (log.topics[0]?.toLowerCase() !== TRANSFER_EVENT_TOPIC.toLowerCase()) continue;
          if (log.address.toLowerCase() !== ARC_CONTRACTS.USDC.toLowerCase()) continue;
          try {
            const decoded = decodeEventLog({
              abi: [
                {
                  type: "event",
                  name: "Transfer",
                  inputs: [
                    { name: "from", type: "address", indexed: true },
                    { name: "to", type: "address", indexed: true },
                    { name: "value", type: "uint256", indexed: false },
                  ],
                },
              ] as const,
              data: log.data,
              topics: log.topics,
            });
            const to = decoded.args.to as string;
            const value = decoded.args.value as bigint;
            if (to.toLowerCase() === treasury.toLowerCase()) {
              verifiedRecipient = getAddress(to);
              verifiedAmountUsdc = Number(formatUnits(value, 6));
              recipientMatch = true;
              amountMatch = value === amount;
              transferVerified = recipientMatch && amountMatch;
              break;
            }
          } catch {
            // continue scanning
          }
        }

        const explorerUrl = `${arcTestnet.blockExplorers.default.url}/tx/${hash}`;
        const effectiveGasPrice = receipt.effectiveGasPrice ?? 0n;
        const gasCostWei = receipt.gasUsed * effectiveGasPrice;

        const swapResult: OnchainSwapResult = {
          txHash: hash,
          explorerUrl,
          status: receipt.status === "success" ? "success" : "reverted",
          gasUsed: receipt.gasUsed,
          effectiveGasPrice,
          gasCostUsdc: Number(formatUnits(gasCostWei, 6)),
          transferVerified,
          verifiedRecipient,
          verifiedAmountUsdc,
          expectedRecipient: treasury,
          expectedAmountUsdc: amountUsdc,
          recipientMatch,
          amountMatch,
        };

        setResult(swapResult);

        if (receipt.status !== "success") {
          setError("Transaction reverted on-chain");
          setPhase("failed");
        } else if (!transferVerified) {
          setError(
            !recipientMatch
              ? "Transfer event missing — recipient did not match treasury"
              : "Transfer amount mismatch — verification failed",
          );
          setPhase("failed");
        } else {
          setPhase("confirmed");
        }

        return swapResult;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "On-chain swap failed";
        if (msg.includes("User rejected") || msg.includes("denied") || msg.includes("rejected")) {
          setError("Transaction rejected in wallet");
        } else {
          setError(msg.length > 160 ? msg.slice(0, 160) + "…" : msg);
        }
        setPhase("failed");
        return null;
      }
    },
    [isConnected, address, walletClient, publicClient, chainId, switchChainAsync, estimateGas],
  );

  const retry = useCallback(async () => {
    if (lastAmount == null) return null;
    return execute(lastAmount);
  }, [execute, lastAmount]);

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

  return {
    phase,
    error,
    result,
    gasEstimate,
    execute,
    retry,
    reset,
    usdcBalance,
    estimateGas,
    canRetry: lastAmount != null && (phase === "failed" || phase === "confirmed"),
  };
}
