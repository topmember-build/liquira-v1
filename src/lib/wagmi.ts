import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { arcTestnet } from "./arc-testnet";

const WC_PROJECT_ID =
  (
    (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined) ??
    (import.meta.env.WALLETCONNECT_PROJECT_ID as string | undefined) ??
    (typeof process !== "undefined"
      ? (process.env as any).VITE_WALLETCONNECT_PROJECT_ID ?? (process.env as any).WALLETCONNECT_PROJECT_ID
      : undefined)
  )?.trim() || "";

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

// Arc Testnet only - additional chains will be added in future releases.
export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors,
  transports: {
    [arcTestnet.id]: http("https://rpc.testnet.arc.network"),
  },
  ssr: true,
});

export const CHAIN_ID_MAP: Record<string, number> = {
  "arc-testnet": arcTestnet.id,
};

export const CHAIN_ID_REVERSE: Record<number, string> = Object.fromEntries(
  Object.entries(CHAIN_ID_MAP).map(([k, v]) => [v, k]),
);

export const HAS_WALLETCONNECT = !!WC_PROJECT_ID;
