export type Chain = {
  id: string;
  name: string;
  shortName: string;
  explorer: string;
  nativeSymbol: string;
};

export const CHAINS: Chain[] = [
  { id: "base", name: "Base", shortName: "BASE", explorer: "https://basescan.org", nativeSymbol: "ETH" },
  { id: "ethereum", name: "Ethereum", shortName: "ETH", explorer: "https://etherscan.io", nativeSymbol: "ETH" },
  { id: "arbitrum", name: "Arbitrum One", shortName: "ARB", explorer: "https://arbiscan.io", nativeSymbol: "ETH" },
  { id: "optimism", name: "Optimism", shortName: "OP", explorer: "https://optimistic.etherscan.io", nativeSymbol: "ETH" },
  { id: "polygon", name: "Polygon", shortName: "MATIC", explorer: "https://polygonscan.com", nativeSymbol: "MATIC" },
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
  { symbol: "EURS", name: "STASIS EURO", pegCurrency: "EUR", pegValueUsd: 1.0825, decimals: 2, color: "#0044AA" },
  { symbol: "GYEN", name: "GMO JPY", pegCurrency: "JPY", pegValueUsd: 0.0064, decimals: 6, color: "#BC002D" },
  { symbol: "XSGD", name: "StraitsX SGD", pegCurrency: "SGD", pegValueUsd: 0.74, decimals: 6, color: "#EF3340" },
  { symbol: "GBPT", name: "Poundtoken", pegCurrency: "GBP", pegValueUsd: 1.27, decimals: 6, color: "#012169" },
  { symbol: "BRZ", name: "Brazilian Digital Token", pegCurrency: "BRL", pegValueUsd: 0.2, decimals: 4, color: "#009C3B" },
];

export function getStable(symbol: string): Stable | undefined {
  return STABLES.find((s) => s.symbol === symbol.toUpperCase());
}

export function getChain(id: string): Chain | undefined {
  return CHAINS.find((c) => c.id === id);
}
