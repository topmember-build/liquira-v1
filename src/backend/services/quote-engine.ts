/**
 * Quote Engine - Core routing aggregator
 *
 * Fetches quotes from multiple providers (LI.FI, Socket, Relay)
 * Normalizes responses into a common format
 * Scores routes based on optimization strategy
 *
 * Key Principle: Quote engine DOES NOT select a provider permanently.
 * It only prepares candidate routes. ARC handles provider selection at execution time.
 */

import axios, { AxiosInstance } from "axios";
import { CONFIGURATION } from "../config/environment";
import {
  QuoteRequest,
  NormalizedQuote,
  RouteStep,
  ProviderQuote,
  LiFiQuoteResponse,
  SocketQuoteResponse,
} from "../types";
import { logger } from "../utils/logger";

interface ChainMapping {
  lifi: string;
  socket: string;
  native: string;
}

/**
 * Supported chains mapping across different providers
 */
const CHAIN_MAPPINGS: Record<string, ChainMapping> = {
  ethereum: {
    lifi: "ETH",
    socket: "1",
    native: "ethereum",
  },
  polygon: {
    lifi: "POL",
    socket: "137",
    native: "polygon",
  },
  arbitrum: {
    lifi: "ARB",
    socket: "42161",
    native: "arbitrum",
  },
  optimism: {
    lifi: "OPT",
    socket: "10",
    native: "optimism",
  },
  base: {
    lifi: "BAS",
    socket: "8453",
    native: "base",
  },
};

/**
 * Quote Engine Service
 * Manages quote aggregation from multiple providers
 */
export class QuoteEngine {
  private lifiClient: AxiosInstance;
  private socketClient: AxiosInstance;
  private relayClient: AxiosInstance;

  constructor() {
    // Initialize provider clients
    this.lifiClient = axios.create({
      baseURL: CONFIGURATION.PROVIDERS.LIFI.baseUrl,
      timeout: CONFIGURATION.PROVIDERS.LIFI.timeout,
      headers: this.getLiFiHeaders(),
    });

    this.socketClient = axios.create({
      baseURL: CONFIGURATION.PROVIDERS.SOCKET.baseUrl,
      timeout: CONFIGURATION.PROVIDERS.SOCKET.timeout,
      headers: this.getSocketHeaders(),
    });

    this.relayClient = axios.create({
      baseURL: CONFIGURATION.PROVIDERS.RELAY.baseUrl,
      timeout: CONFIGURATION.PROVIDERS.RELAY.timeout,
      headers: this.getRelayHeaders(),
    });
  }

  private getLiFiHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (CONFIGURATION.PROVIDERS.LIFI.apiKey) {
      headers["Authorization"] = `Bearer ${CONFIGURATION.PROVIDERS.LIFI.apiKey}`;
    }
    return headers;
  }

  private getSocketHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (CONFIGURATION.PROVIDERS.SOCKET.apiKey) {
      headers["API-KEY"] = CONFIGURATION.PROVIDERS.SOCKET.apiKey;
    }
    return headers;
  }

  private getRelayHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (CONFIGURATION.PROVIDERS.RELAY.apiKey) {
      headers["Authorization"] = `Bearer ${CONFIGURATION.PROVIDERS.RELAY.apiKey}`;
    }
    return headers;
  }

  /**
   * Get quotes from all enabled providers
   * Runs requests in parallel for performance
   */
  async getQuotes(request: QuoteRequest): Promise<NormalizedQuote[]> {
    logger.info("Quote Engine: Fetching quotes", {
      from: request.sourceChain,
      to: request.destinationChain,
      amount: request.amount,
    });

    const quotePromises: Promise<NormalizedQuote | null>[] = [];

    // Request from LI.FI
    if (CONFIGURATION.PROVIDERS.LIFI.enabled) {
      quotePromises.push(this.fetchLiFiQuote(request).catch((err) => {
        logger.error("LI.FI quote fetch failed", { error: err.message });
        return null;
      }));
    }

    // Request from Socket
    if (CONFIGURATION.PROVIDERS.SOCKET.enabled) {
      quotePromises.push(this.fetchSocketQuote(request).catch((err) => {
        logger.error("Socket quote fetch failed", { error: err.message });
        return null;
      }));
    }

    // Request from Relay
    if (CONFIGURATION.PROVIDERS.RELAY.enabled) {
      quotePromises.push(this.fetchRelayQuote(request).catch((err) => {
        logger.error("Relay quote fetch failed", { error: err.message });
        return null;
      }));
    }

    // Wait for all requests
    const results = await Promise.all(quotePromises);
    const quotes = results.filter((quote): quote is NormalizedQuote => quote !== null);

    if (quotes.length === 0) {
      throw new Error("Failed to fetch quotes from any provider");
    }

    logger.info("Quote Engine: Successfully fetched quotes", {
      count: quotes.length,
      providers: quotes.map((q) => q.providerId),
    });

    return quotes;
  }

  /**
   * Fetch quote from LI.FI
   */
  private async fetchLiFiQuote(request: QuoteRequest): Promise<NormalizedQuote> {
    logger.debug("Fetching LI.FI quote");

    const sourceChainKey = CHAIN_MAPPINGS[request.sourceChain];
    const destChainKey = CHAIN_MAPPINGS[request.destinationChain];

    if (!sourceChainKey || !destChainKey) {
      throw new Error(
        `Unsupported chain mapping for ${request.sourceChain} or ${request.destinationChain}`
      );
    }

    const response = await this.lifiClient.get<LiFiQuoteResponse>("/quote", {
      params: {
        fromChain: sourceChainKey.lifi,
        toChain: destChainKey.lifi,
        fromToken: request.sourceToken,
        toToken: request.destinationToken,
        fromAmount: request.amount,
        fromAddress: request.userAddress,
        toAddress: request.userAddress,
        slippage: 0.01, // 1% default slippage
      },
    });

    const data = response.data;

    // Parse gas fees and bridge fees
    const gasCosts = data.estimate.gasCosts || [];
    const feeCosts = data.estimate.feeCosts || [];

    const totalGasFee = gasCosts.reduce((sum, cost: any) => sum + BigInt(cost.amount || 0), 0n);
    const totalBridgeFee = feeCosts.reduce((sum, cost: any) => sum + BigInt(cost.amount || 0), 0n);
    const totalFees = totalGasFee + totalBridgeFee;

    // Calculate slippage percentage
    const outputAmount = BigInt(data.estimate.toAmount || data.estimate.toAmountMin);
    const expectedAmount = BigInt(data.estimate.toAmountUSD || "0");
    const slippagePercent = expectedAmount > 0n
      ? Number((totalFees * 100n) / expectedAmount) / 100
      : 0;

    // Build route steps from included steps
    const route = this.buildLiFiRoute(data.includedSteps);

    return {
      quoteId: `lifi-${Date.now()}-${Math.random()}`,
      providerId: "lifi",
      estimatedOutput: data.estimate.toAmount,
      estimatedOutputUSD: parseFloat(data.estimate.toAmountUSD || "0"),
      fees: {
        gasFee: totalGasFee.toString(),
        bridgeFee: totalBridgeFee.toString(),
        slippagePercent,
        total: totalFees.toString(),
      },
      estimatedTime: data.estimate.executionDuration,
      route,
      rawResponse: data,
      score: 0, // Will be set by optimizer
      arcPayload: this.toLiFiArcPayload(data, request),
    };
  }

  /**
   * Fetch quote from Socket
   */
  private async fetchSocketQuote(request: QuoteRequest): Promise<NormalizedQuote> {
    logger.debug("Fetching Socket quote");

    const sourceChainKey = CHAIN_MAPPINGS[request.sourceChain];
    const destChainKey = CHAIN_MAPPINGS[request.destinationChain];

    if (!sourceChainKey || !destChainKey) {
      throw new Error(
        `Unsupported chain mapping for ${request.sourceChain} or ${request.destinationChain}`
      );
    }

    const response = await this.socketClient.get<SocketQuoteResponse>("/routes", {
      params: {
        fromChainId: sourceChainKey.socket,
        toChainId: destChainKey.socket,
        fromTokenAddress: request.sourceToken,
        toTokenAddress: request.destinationToken,
        amount: request.amount,
        userAddress: request.userAddress,
        maxSlippage: 1, // 1%
        includePrice: true,
      },
    });

    if (!response.data.result.routes || response.data.result.routes.length === 0) {
      throw new Error("No routes found in Socket response");
    }

    // Use first route (best one)
    const socketRoute = response.data.result.routes[0];

    return {
      quoteId: `socket-${Date.now()}-${Math.random()}`,
      providerId: "socket",
      estimatedOutput: socketRoute.outputAmount,
      estimatedOutputUSD: parseFloat(socketRoute.outputValueInUsd || "0"),
      fees: {
        gasFee: "0", // Socket doesn't always break this down
        bridgeFee: "0",
        slippagePercent: parseFloat(socketRoute.priceImpactPercent || "0"),
        total: "0",
      },
      estimatedTime: socketRoute.totalDurationInSeconds,
      route: this.buildSocketRoute(socketRoute),
      rawResponse: socketRoute,
      score: 0,
      arcPayload: this.toSocketArcPayload(socketRoute, request),
    };
  }

  /**
   * Fetch quote from Relay (placeholder - similar structure to LI.FI)
   */
  private async fetchRelayQuote(request: QuoteRequest): Promise<NormalizedQuote> {
    logger.debug("Fetching Relay quote");

    if (!CONFIGURATION.PROVIDERS.RELAY.enabled) {
      throw new Error("Relay provider is disabled by configuration");
    }

    if (!CONFIGURATION.PROVIDERS.RELAY.apiKey) {
      throw new Error("Relay provider enabled but RELAY_API_KEY is not configured");
    }

    const sourceChainKey = CHAIN_MAPPINGS[request.sourceChain];
    const destChainKey = CHAIN_MAPPINGS[request.destinationChain];

    if (!sourceChainKey || !destChainKey) {
      throw new Error(
        `Unsupported chain mapping for ${request.sourceChain} or ${request.destinationChain}`
      );
    }

    const response = await this.relayClient.post<any>("/quotes", {
      sourceChain: sourceChainKey.native,
      targetChain: destChainKey.native,
      sourceToken: request.sourceToken,
      targetToken: request.destinationToken,
      amount: request.amount,
      fromAddress: request.userAddress,
      toAddress: request.userAddress,
      maxSlippage: 1,
    });

    const relayQuote = response.data?.quote || response.data?.result || response.data;
    if (!relayQuote) {
      throw new Error("Relay returned an unexpected quote payload");
    }

    const estimatedOutput = String(
      relayQuote.estimatedOutput || relayQuote.toAmount || relayQuote.outputAmount || "0"
    );
    const estimatedTime = Number(
      relayQuote.estimatedTimeSeconds || relayQuote.estimatedTime || relayQuote.duration || 0
    );
    const totalFees = String(relayQuote.totalFee || relayQuote.fee || "0");
    const slippage = Number(relayQuote.priceImpact || relayQuote.slippagePercent || 0);

    return {
      quoteId: `relay-${Date.now()}-${Math.random()}`,
      providerId: "relay",
      estimatedOutput,
      estimatedOutputUSD: parseFloat(String(relayQuote.estimatedOutputUSD || relayQuote.toAmountUsd || "0")),
      fees: {
        gasFee: String(relayQuote.gasFee || relayQuote.fee || "0"),
        bridgeFee: String(relayQuote.bridgeFee || relayQuote.fee || "0"),
        slippagePercent: slippage,
        total: totalFees,
      },
      estimatedTime,
      route: this.buildRelayRoute(relayQuote, request),
      rawResponse: relayQuote,
      score: 0,
      arcPayload: this.toRelayArcPayload(relayQuote, request),
    };
  }

  private buildRelayRoute(route: any, request: QuoteRequest): RouteStep[] {
    return [
      {
        id: "relay-step-0",
        type: route.type === "swap" ? "swap" : "bridge",
        from: {
          token: request.sourceToken,
          chain: request.sourceChain,
          amount: request.amount,
        },
        to: {
          token: request.destinationToken,
          chain: request.destinationChain,
        },
        minOutput: String(route.minAmountOut || route.minAmount || route.toAmount || "0"),
      },
    ];
  }

  private toRelayArcPayload(route: any, request: QuoteRequest): any {
    return {
      version: "1.0",
      routeId: `relay-route-${Date.now()}`,
      transactionId: "",
      recipient: request.userAddress,
      sourceChain: request.sourceChain,
      destinationChain: request.destinationChain,
      steps: [
        {
          id: "arc-step-0",
          type: route.type === "swap" ? "swap" : "bridge",
          chainId: this.chainNameToId(request.sourceChain),
          swapData:
            route.type === "swap"
              ? {
                  tokenIn: request.sourceToken,
                  tokenOut: request.destinationToken,
                  amountIn: request.amount,
                  minAmountOut: String(route.minAmountOut || route.minAmount || route.toAmount || "0"),
                  deadline: Math.floor(Date.now() / 1000) + 1800,
                }
              : undefined,
          bridgeData:
            route.type !== "swap"
              ? {
                  token: request.sourceToken,
                  amount: request.amount,
                  destinationChain: request.destinationChain,
                  recipient: request.userAddress,
                }
              : undefined,
        },
      ],
      deadline: Math.floor(Date.now() / 1000) + 1800,
    };
  }

  /**
   * Build route steps from LI.FI response
   */
  private buildLiFiRoute(steps: any[]): RouteStep[] {
    return steps.map((step, index) => ({
      id: `step-${index}`,
      type: step.tool === "swap" ? "swap" : "bridge",
      from: {
        token: step.action.fromToken?.address || "",
        chain: step.action.fromChainId?.toString() || "",
        amount: step.action.fromAmount || "",
      },
      to: {
        token: step.action.toToken?.address || "",
        chain: step.action.toChainId?.toString() || "",
      },
      minOutput: step.estimate?.toAmountMin || step.estimate?.toAmount || "",
    }));
  }

  /**
   * Build route steps from Socket response
   */
  private buildSocketRoute(route: any): RouteStep[] {
    return (route.steps || []).map((step: any, index: number) => ({
      id: `step-${index}`,
      type: step.type,
      from: {
        token: step.from?.tokenAddress || "",
        chain: step.from?.chainId?.toString() || "",
        amount: step.from?.amount || "",
      },
      to: {
        token: step.to?.tokenAddress || "",
        chain: step.to?.chainId?.toString() || "",
      },
      minOutput: step.minAmountOut || step.amount || "",
    }));
  }

  /**
   * Convert LI.FI quote to ARC execution payload format
   */
  private toLiFiArcPayload(data: LiFiQuoteResponse, request: QuoteRequest): any {
    // Convert route steps to ARC format
    const arcSteps = data.includedSteps.map((step: any, index: number) => {
      const stepType = step.tool === "swap" ? "swap" : "bridge";

      if (stepType === "swap") {
        return {
          id: `arc-step-${index}`,
          type: "swap",
          chainId: this.chainNameToId(request.sourceChain),
          swapData: {
            tokenIn: request.sourceToken,
            tokenOut: request.destinationToken,
            amountIn: request.amount,
            minAmountOut: step.estimate?.toAmountMin || step.estimate?.toAmount || "0",
            deadline: Math.floor(Date.now() / 1000) + 1800, // 30 min deadline
          },
        };
      } else {
        return {
          id: `arc-step-${index}`,
          type: "bridge",
          chainId: this.chainNameToId(request.sourceChain),
          bridgeData: {
            token: request.sourceToken,
            amount: request.amount,
            destinationChain: request.destinationChain,
            recipient: request.userAddress,
          },
        };
      }
    });

    return {
      version: "1.0",
      routeId: `lifi-route-${Date.now()}`,
      transactionId: "", // Will be set by orchestrator
      recipient: request.userAddress,
      sourceChain: request.sourceChain,
      destinationChain: request.destinationChain,
      steps: arcSteps,
      deadline: Math.floor(Date.now() / 1000) + 1800,
    };
  }

  /**
   * Convert Socket quote to ARC payload format
   */
  private toSocketArcPayload(route: any, request: QuoteRequest): any {
    return {
      version: "1.0",
      routeId: route.routeId,
      transactionId: "", // Will be set by orchestrator
      recipient: request.userAddress,
      sourceChain: request.sourceChain,
      destinationChain: request.destinationChain,
      steps: (route.steps || []).map((step: any, index: number) => ({
        id: `arc-step-${index}`,
        type: step.type,
        chainId: this.chainNameToId(step.from?.chainId || request.sourceChain),
        swapData:
          step.type === "swap"
            ? {
                tokenIn: step.from?.tokenAddress,
                tokenOut: step.to?.tokenAddress,
                amountIn: step.from?.amount,
                minAmountOut: step.to?.minAmount || step.to?.amount,
                deadline: Math.floor(Date.now() / 1000) + 1800,
              }
            : undefined,
        bridgeData:
          step.type === "bridge"
            ? {
                token: step.from?.tokenAddress,
                amount: step.from?.amount,
                destinationChain: request.destinationChain,
                recipient: request.userAddress,
              }
            : undefined,
      })),
      deadline: Math.floor(Date.now() / 1000) + 1800,
    };
  }

  /**
   * Helper: Convert chain name to chain ID
   */
  private chainNameToId(chainName: string): number {
    const chainIds: Record<string, number> = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      base: 8453,
    };
    return chainIds[chainName.toLowerCase()] || 1;
  }
}

export const quoteEngine = new QuoteEngine();
