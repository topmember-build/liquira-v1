/**
 * Token definitions with addresses for different chains
 */

import { STABLES, CHAINS } from "./stables";

export interface Token {
  symbol: string;
  address: string;
  decimals: number;
  name: string;
  chainId: string;
  icon?: string;
  stable?: boolean;
}

// Token addresses for different chains
// These are mock addresses for testing - in production these would be real contract addresses
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  "ethereum": {
    "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "DAI": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "WETH": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  "polygon": {
    "USDC": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    "DAI": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    "WMATIC": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  },
  "arbitrum": {
    "USDC": "0xFF970A61A04b1cA14834A43f5de4533eBDDB5CC8",
    "USDT": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    "DAI": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  },
  "optimism": {
    "USDC": "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    "USDT": "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    "DAI": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  },
  "base": {
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "USDT": "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    "DAI": "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  },
  "arc-testnet": {
    "USDC": "0x3600000000000000000000000000000000000000",
    "EURC": "0x3600000000000000000000000000000000000001",
  },
};

// Generate tokens for all chains
export const TOKENS: Token[] = [];

CHAINS.forEach(chain => {
  const chainTokens = TOKEN_ADDRESSES[chain.id] || {};

  Object.entries(chainTokens).forEach(([symbol, address]) => {
    const stable = STABLES.find(s => s.symbol === symbol);
    if (stable) {
      TOKENS.push({
        symbol,
        address,
        decimals: stable.decimals,
        name: stable.name,
        chainId: chain.id,
        stable: true,
        icon: `https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png`, // Generic stable icon
      });
    }
  });
});

// Add some non-stable tokens for testing
const NON_STABLE_TOKENS: Token[] = [
  {
    symbol: "WETH",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    name: "Wrapped Ether",
    chainId: "ethereum",
    icon: "https://assets.coingecko.com/coins/images/2518/small/weth.png",
  },
  {
    symbol: "WMATIC",
    address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    decimals: 18,
    name: "Wrapped Matic",
    chainId: "polygon",
    icon: "https://assets.coingecko.com/coins/images/14073/small/matic.png",
  },
];

TOKENS.push(...NON_STABLE_TOKENS);

/**
 * Get tokens for a specific chain
 */
export const getTokensForChain = (chainId: string): Token[] => {
  return TOKENS.filter(token => token.chainId === chainId);
};

/**
 * Get a token by address and chain
 */
export const getTokenByAddress = (address: string, chainId?: string): Token | undefined => {
  const normalizedAddress = address.toLowerCase();
  return TOKENS.find(token =>
    token.address.toLowerCase() === normalizedAddress &&
    (!chainId || token.chainId === chainId)
  );
};

/**
 * Get a token by symbol and chain
 */
export const getTokenBySymbol = (symbol: string, chainId?: string): Token | undefined => {
  const normalizedSymbol = symbol.toUpperCase();
  return TOKENS.find(token =>
    token.symbol.toUpperCase() === normalizedSymbol &&
    (!chainId || token.chainId === chainId)
  );
};

/**
 * Get all unique tokens (across chains)
 */
export const getUniqueTokens = (): Token[] => {
  const unique = Array.from(
    new Map(TOKENS.map(token => [token.symbol, token])).values()
  );
  return unique;
};
