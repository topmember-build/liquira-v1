export type Chain = {
  id: string;
  name: string;
  shortName: string;
  explorer: string;
  nativeSymbol: string;
  icon?: string;
};

// Only Arc Testnet is supported today. Other chains will return in future updates.
export const CHAINS: Chain[] = [
  { id: "arc-testnet", name: "Arc Testnet", shortName: "ARC", explorer: "https://testnet.arcscan.app", nativeSymbol: "USDC" },
];

export type Stable = {
  symbol: string;
  name: string;
  pegCurrency: string; // USD, EUR, GBP...
  pegValueUsd: number; // anchor used for cross-rate calculation
  decimals: number;
  color: string;
};

export const STABLES: Stable[] = [
  { symbol: "USDC", name: "USD Coin", pegCurrency: "USD", pegValueUsd: 1.0, decimals: 6, color: "#2775CA" },
  { symbol: "USDT", name: "Tether USD", pegCurrency: "USD", pegValueUsd: 1.0, decimals: 6, color: "#26A17B" },
  { symbol: "DAI", name: "Dai", pegCurrency: "USD", pegValueUsd: 1.0, decimals: 18, color: "#F4B731" },
  { symbol: "PYUSD", name: "PayPal USD", pegCurrency: "USD", pegValueUsd: 1.0, decimals: 6, color: "#0070BA" },
  { symbol: "EURC", name: "Euro Coin", pegCurrency: "EUR", pegValueUsd: 1.0825, decimals: 6, color: "#003399" },
  { symbol: "cirBTC", name: "Circle Bitcoin", pegCurrency: "BTC", pegValueUsd: 45000.0, decimals: 8, color: "#F7931A" },
  { symbol: "EURS", name: "STASIS EURO", pegCurrency: "EUR", pegValueUsd: 1.0825, decimals: 2, color: "#0044AA" },
  { symbol: "GYEN", name: "GMO JPY", pegCurrency: "JPY", pegValueUsd: 0.0064, decimals: 6, color: "#BC002D" },
  { symbol: "XSGD", name: "StraitsX SGD", pegCurrency: "SGD", pegValueUsd: 0.74, decimals: 6, color: "#EF3340" },
  { symbol: "GBPT", name: "Poundtoken", pegCurrency: "GBP", pegValueUsd: 1.27, decimals: 6, color: "#012169" },
  { symbol: "BRZ", name: "Brazilian Digital Token", pegCurrency: "BRL", pegValueUsd: 0.2, decimals: 4, color: "#009C3B" },
  { symbol: "KRW1", name: "Korean Won Stable", pegCurrency: "KRW", pegValueUsd: 0.000726, decimals: 6, color: "#003478" },
  { symbol: "JPYC", name: "JPY Coin", pegCurrency: "JPY", pegValueUsd: 0.0064, decimals: 6, color: "#BC002D" },
  { symbol: "MXNB", name: "Mexican Peso Stable", pegCurrency: "MXN", pegValueUsd: 0.0512, decimals: 6, color: "#006847" },
  { symbol: "SGDX", name: "Singapore Dollar Stable", pegCurrency: "SGD", pegValueUsd: 0.7421, decimals: 6, color: "#EF3340" },
  { symbol: "NGNX", name: "Naira Stable", pegCurrency: "NGN", pegValueUsd: 0.00062, decimals: 6, color: "#008751" },
  { symbol: "AEDC", name: "Dirham Coin", pegCurrency: "AED", pegValueUsd: 0.2724, decimals: 6, color: "#007A3D" },
];

export function getStable(symbol: string): Stable | undefined {
  return STABLES.find((s) => s.symbol === symbol.toUpperCase());
}

export function getChain(id: string): Chain | undefined {
  return CHAINS.find((c) => c.id === id);
}
