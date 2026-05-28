/**
 * usePermitSignature Hook
 *
 * Request EIP-712 permit signature from connected wallet.
 * Supports ERC-2612 permit signing for Arc Testnet.
 */

import { useCallback, useState } from "react";
import { useSignTypedData, useAccount, useChainId, useSwitchChain } from "wagmi";
import { getAddress, createPublicClient, http } from "viem";
import { calculatePermitDeadline, ERC2612_PERMIT_TYPES, getERC2612Domain } from "@/lib/permit2";
import { arcTestnet } from "@/lib/arc-testnet";

export interface PermitSignRequest {
  owner: `0x${string}`;
  spender: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  nonce?: bigint;
  deadline?: number;
}

export interface PermitSignResult {
  signature: `0x${string}`;
  permitData: {
    owner: `0x${string}`;
    spender: `0x${string}`;
    value: string;
    nonce: string;
    deadline: number;
    token: `0x${string}`;
  };
}

export function usePermitSignature() {
  const { signTypedDataAsync } = useSignTypedData();
  const { address: walletAddress, isConnected } = useAccount();
  const evmChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const requestPermitSignature = useCallback(
    async (request: PermitSignRequest): Promise<PermitSignResult | null> => {
      if (!isConnected || !walletAddress) {
        const err = new Error("Wallet not connected. Please connect your wallet and try again.");
        setError(err);
        console.error("[Permit] Wallet connection error:", err);
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // Ensure wallet is on Arc Testnet before signing
        if (evmChainId !== arcTestnet.id) {
          console.log(`[Permit] Switching from chain ${evmChainId} to Arc Testnet ${arcTestnet.id}`);
          try {
            await switchChainAsync({ chainId: arcTestnet.id });
          } catch (switchErr) {
            const err = new Error(
              `Failed to switch to Arc Testnet. Please switch manually in your wallet to Chain ID ${arcTestnet.id}`,
            );
            setError(err);
            console.error("[Permit] Chain switch failed:", switchErr);
            setLoading(false);
            return null;
          }
        }

        const owner = getAddress(request.owner);
        const spender = getAddress(request.spender);
        const token = getAddress(request.token);
        const deadline = request.deadline ?? calculatePermitDeadline(3600);

        const publicClient = createPublicClient({
          chain: arcTestnet,
          transport: http(),
        });

        const onChainNonce = await publicClient.readContract({
          address: token,
          abi: [
            {
              type: "function" as const,
              name: "nonces",
              stateMutability: "view" as const,
              inputs: [{ name: "owner", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "nonces",
          args: [owner],
        });

        const nonce = request.nonce ? BigInt(request.nonce) : BigInt(onChainNonce.toString());

        console.log("[Permit] Requesting EIP-712 signature", {
          owner,
          spender,
          token,
          amount: request.amount.toString(),
          nonce: nonce.toString(),
          deadline,
        });

        const domain = await getERC2612Domain(token, arcTestnet.id, publicClient);
        if (walletAddress.toLowerCase() !== owner.toLowerCase()) {
          const err = new Error("Connected wallet address does not match permit owner address.");
          setError(err);
          console.error("[Permit] Wallet owner mismatch:", {
            walletAddress,
            owner,
          });
          return null;
        }

        const signature = await signTypedDataAsync({
          account: walletAddress as `0x${string}`,
          domain,
          types: ERC2612_PERMIT_TYPES,
          primaryType: "Permit",
          message: {
            owner,
            spender,
            value: request.amount,
            nonce,
            deadline: BigInt(deadline),
          },
        } as any);

        console.log("[Permit] Signature received:", signature);

        return {
          signature: signature as `0x${string}`,
          permitData: {
            owner,
            spender,
            value: request.amount.toString(),
            nonce: nonce.toString(),
            deadline,
            token,
          },
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("[Permit] Signature request failed:", error);
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, walletAddress, signTypedDataAsync, evmChainId, switchChainAsync],
  );

  return { requestPermitSignature, loading, error };
}
