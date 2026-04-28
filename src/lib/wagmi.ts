import { createConfig, http } from "wagmi";
import { mainnet, base, arbitrum, optimism, polygon } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// WalletConnect Project ID is a public identifier (safe to expose).
// Get one for free at https://cloud.reown.com — set VITE_WALLETCONNECT_PROJECT_ID.
const WC_PROJECT_ID =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim() || "";

const connectors = [
  injected({ shimDisconnect: true }),
  ...(WC_PROJECT_ID
    ? [
        walletConnect({
          projectId: WC_PROJECT_ID,
          metadata: {
            name: "Liquira",
            description: "Stablecoin FX Router on Arc Network",
            url: typeof window !== "undefined" ? window.location.origin : "https://liquira.app",
            icons: [],
          },
          showQrModal: true,
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [base, mainnet, arbitrum, optimism, polygon],
  connectors,
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
  },
  ssr: true,
});

// Map between our internal chain ids (lowercase string) and EVM chainId numbers.
export const CHAIN_ID_MAP: Record<string, number> = {
  base: base.id,
  ethereum: mainnet.id,
  arbitrum: arbitrum.id,
  optimism: optimism.id,
  polygon: polygon.id,
};

export const CHAIN_ID_REVERSE: Record<number, string> = Object.fromEntries(
  Object.entries(CHAIN_ID_MAP).map(([k, v]) => [v, k]),
);

export const HAS_WALLETCONNECT = !!WC_PROJECT_ID;
