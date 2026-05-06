/**
 * Arc Testnet chain definition and contract addresses.
 * On-chain USDC transfers use ERC20 transfer() to a destination address.
 */
import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5_042_002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

// Contracts
export const ARC_CONTRACTS = {
  USDC: "0x3600000000000000000000000000000000000000" as const,
  FX_ESCROW: "0x867650F5eAe8df91445971f14d89fd84F0C9a9f8" as const,
  PERMIT2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const,
  MULTICALL3: "0xcA11bde05977b3631167028862bE2a173976CA11" as const,
};


// Minimal ERC-20 ABI for transfer + balance
export const ERC20_TRANSFER_ABI = [
  {
    type: "function" as const,
    name: "transfer",
    stateMutability: "nonpayable" as const,
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function" as const,
    name: "balanceOf",
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Transfer event topic for verification
export const TRANSFER_EVENT_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Faucets
export const FAUCETS = [
  {
    label: "Get Testnet USDC (Arc Faucet)",
    url: "https://thirdweb.com/arc-testnet",
    note: "1 USDC/day",
  },
  {
    label: "Get Testnet USDC (Community Faucet)",
    url: "https://easyfaucetarc.xyz/",
    note: "Up to 100 USDC/day",
  },
  {
    label: "Get Testnet USDC (Circle Faucet)",
    url: "https://faucet.circle.com/",
    note: "Official Circle developer faucet",
  },
];
