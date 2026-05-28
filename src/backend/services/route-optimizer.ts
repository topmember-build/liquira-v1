/**
 * Route Optimizer - Scores and selects best routes
 *
 * Evaluates routes based on multiple criteria:
 * - Lowest fees
 * - Fastest settlement
 * - Lowest slippage
 *
 * Returns ranked routes with scores, allowing user to choose.
 * Does NOT make permanent provider decisions - ARC handles that at execution time.
 */

import { NormalizedQuote } from "../types";
import { CONFIGURATION } from "../config/environment";
import { logger } from "../utils/logger";

export interface OptimizedRoute {
  rank: number;
  quoteId: string;
  providerId: string;
  score: number;
  breakdown: {
    feeScore: number;
    timeScore: number;
    slippageScore: number;
  };
  metrics: {
    totalFees: bigint;
    estimatedTime: number;
    slippagePercent: number;
    estimatedOutput: string;
  };
  recommended: boolean;
  recommendedReason?: string;
}

/**
 * Route Optimizer Service
 */
export class RouteOptimizer {
  /**
   * Score and rank all quotes
   *
   * Scoring is strategy-based:
   * - "lowest-fee": Weight = {fees: 50%, time: 30%, slippage: 20%}
   * - "fastest": Weight = {fees: 30%, time: 50%, slippage: 20%}
   * - "lowest-slippage": Weight = {fees: 30%, time: 30%, slippage: 40%}
   */
  scoreQuotes(
    quotes: NormalizedQuote[],
    strategy: "lowest-fee" | "fastest" | "lowest-slippage" = "lowest-fee"
  ): OptimizedRoute[] {
    logger.info("Route Optimizer: Scoring quotes", {
      count: quotes.length,
      strategy,
    });

    if (quotes.length === 0) {
      throw new Error("No quotes to optimize");
    }

    // Get weights based on strategy
    const weights = this.getWeights(strategy);

    // Calculate scores
    const scoredRoutes = quotes.map((quote) => {
      const feeScore = this.calculateFeeScore(quote, quotes);
      const timeScore = this.calculateTimeScore(quote, quotes);
      const slippageScore = this.calculateSlippageScore(quote, quotes);

      // Weighted score (0-1)
      const score =
        feeScore * weights.fee + timeScore * weights.time + slippageScore * weights.slippage;

      return {
        quoteId: quote.quoteId,
        providerId: quote.providerId,
        score,
        breakdown: {
          feeScore,
          timeScore,
          slippageScore,
        },
        metrics: {
          totalFees: BigInt(quote.fees.total),
          estimatedTime: quote.estimatedTime,
          slippagePercent: quote.fees.slippagePercent,
          estimatedOutput: quote.estimatedOutput,
        },
      };
    });

    // Sort by score (highest first)
    scoredRoutes.sort((a, b) => b.score - a.score);

    // Add ranking and recommendation
    const rankedRoutes: OptimizedRoute[] = scoredRoutes.map((route, index) => ({
      rank: index + 1,
      ...route,
      recommended: index === 0, // Top-ranked is recommended
      recommendedReason: this.getRecommendationReason(strategy, route),
    }));

    logger.info("Route Optimizer: Scoring complete", {
      topScore: rankedRoutes[0]?.score,
      scoreRange: `${Math.min(...rankedRoutes.map((r) => r.score)).toFixed(2)}-${Math.max(...rankedRoutes.map((r) => r.score)).toFixed(2)}`,
    });

    return rankedRoutes;
  }

  /**
   * Get weighting configuration based on strategy
   */
  private getWeights(
    strategy: "lowest-fee" | "fastest" | "lowest-slippage"
  ): { fee: number; time: number; slippage: number } {
    switch (strategy) {
      case "lowest-fee":
        return { fee: 0.5, time: 0.3, slippage: 0.2 };
      case "fastest":
        return { fee: 0.3, time: 0.5, slippage: 0.2 };
      case "lowest-slippage":
        return { fee: 0.3, time: 0.3, slippage: 0.4 };
      default:
        return { fee: 0.5, time: 0.3, slippage: 0.2 };
    }
  }

  /**
   * Calculate fee score (0-1)
   * Higher is better (lower fees get higher score)
   */
  private calculateFeeScore(quote: NormalizedQuote, allQuotes: NormalizedQuote[]): number {
    const fees = BigInt(quote.fees.total);
    const allFees = allQuotes.map((q) => BigInt(q.fees.total));

    const maxFees = allFees.reduce((max, f) => (f > max ? f : max));
    const minFees = allFees.reduce((min, f) => (f < min ? f : min));

    if (maxFees === minFees) {
      return 1; // All fees are equal
    }

    // Normalize: lowest fees get 1.0, highest get 0.0
    const scoreValue = 1 - Number((fees - minFees) * 100n) / Number(maxFees - minFees) / 100;
    return Math.max(0, Math.min(1, scoreValue));
  }

  /**
   * Calculate time score (0-1)
   * Higher is better (faster settlement gets higher score)
   */
  private calculateTimeScore(quote: NormalizedQuote, allQuotes: NormalizedQuote[]): number {
    const time = quote.estimatedTime;
    const allTimes = allQuotes.map((q) => q.estimatedTime);

    const maxTime = Math.max(...allTimes);
    const minTime = Math.min(...allTimes);

    if (maxTime === minTime) {
      return 1; // All times are equal
    }

    // Normalize: fastest gets 1.0, slowest gets 0.0
    return 1 - (time - minTime) / (maxTime - minTime);
  }

  /**
   * Calculate slippage score (0-1)
   * Higher is better (lower slippage gets higher score)
   */
  private calculateSlippageScore(quote: NormalizedQuote, allQuotes: NormalizedQuote[]): number {
    const slippage = quote.fees.slippagePercent;
    const allSlippages = allQuotes.map((q) => q.fees.slippagePercent);

    const maxSlippage = Math.max(...allSlippages);
    const minSlippage = Math.min(...allSlippages);

    if (maxSlippage === minSlippage) {
      return 1; // All slippages are equal
    }

    // Normalize: lowest slippage gets 1.0, highest gets 0.0
    return 1 - (slippage - minSlippage) / (maxSlippage - minSlippage);
  }

  /**
   * Get human-readable recommendation reason
   */
  private getRecommendationReason(
    strategy: string,
    route: {
      metrics: {
        totalFees: bigint;
        estimatedTime: number;
        slippagePercent: number;
      };
    }
  ): string {
    switch (strategy) {
      case "lowest-fee":
        return `Lowest fees: ${this.formatBigInt(route.metrics.totalFees)} wei`;
      case "fastest":
        return `Fastest settlement: ${route.metrics.estimatedTime} seconds`;
      case "lowest-slippage":
        return `Lowest slippage: ${route.metrics.slippagePercent.toFixed(2)}%`;
      default:
        return "Balanced approach";
    }
  }

  /**
   * Format large numbers for display
   */
  private formatBigInt(value: bigint): string {
    const str = value.toString();
    if (str.length <= 3) {
      return str;
    }
    return `${str.substring(0, str.length - 3)}.${str.substring(str.length - 3)}`;
  }

  /**
   * Check if route meets acceptable thresholds
   */
  isRouteAcceptable(quote: NormalizedQuote): boolean {
    // Check slippage threshold
    if (
      quote.fees.slippagePercent >
      CONFIGURATION.ROUTE_OPTIMIZER.MAX_ACCEPTABLE_SLIPPAGE
    ) {
      logger.warn("Route rejected: slippage too high", {
        slippage: quote.fees.slippagePercent,
        threshold: CONFIGURATION.ROUTE_OPTIMIZER.MAX_ACCEPTABLE_SLIPPAGE,
      });
      return false;
    }

    // Add more threshold checks as needed
    return true;
  }

  /**
   * Estimate potential output range based on multiple quotes
   */
  getOutputRange(quotes: NormalizedQuote[]): { min: string; max: string; average: string } {
    if (quotes.length === 0) {
      return { min: "0", max: "0", average: "0" };
    }

    const outputs = quotes.map((q) => BigInt(q.estimatedOutput));
    const min = outputs.reduce((a, b) => (a < b ? a : b));
    const max = outputs.reduce((a, b) => (a > b ? a : b));
    const average = outputs.reduce((a, b) => a + b, 0n) / BigInt(outputs.length);

    return {
      min: min.toString(),
      max: max.toString(),
      average: average.toString(),
    };
  }
}

export const routeOptimizer = new RouteOptimizer();
