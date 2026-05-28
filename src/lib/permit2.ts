export function calculatePermitDeadline(seconds: number): number {
  return Math.floor(Date.now() / 1000) + seconds;
}

export const ERC2612_PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

import type { PublicClient } from "viem";

export async function getERC2612Domain(
  token: string,
  chainId: number,
  publicClient?: PublicClient,
) {
  let name = "ERC20 Permit";
  let version = "1";

  if (publicClient) {
    try {
      const [onchainName, onchainVersion] = await Promise.all([
        publicClient.readContract({
          address: token as `0x${string}`,
          abi: [
            {
              type: "function" as const,
              name: "name",
              stateMutability: "view" as const,
              inputs: [],
              outputs: [{ name: "", type: "string" }],
            },
          ],
          functionName: "name",
        }),
        publicClient.readContract({
          address: token as `0x${string}`,
          abi: [
            {
              type: "function" as const,
              name: "version",
              stateMutability: "view" as const,
              inputs: [],
              outputs: [{ name: "", type: "string" }],
            },
          ],
          functionName: "version",
        }),
      ]);

      if (typeof onchainName === "string" && onchainName.length) {
        name = onchainName;
      }
      if (typeof onchainVersion === "string" && onchainVersion.length) {
        version = onchainVersion;
      }
    } catch (err) {
      console.warn("[Permit2] Failed to fetch token domain values", err);
    }
  }

  return {
    name,
    version,
    chainId,
    verifyingContract: token,
  };
}
