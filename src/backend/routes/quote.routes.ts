/**
 * Quote Routes
 *
 * Endpoints:
 * - POST /api/quote - Get quotes from multiple providers
 */

import { Router, Request, Response, NextFunction } from "express";
import { quoteEngine } from "../services/quote-engine";
import { routeOptimizer } from "../services/route-optimizer";
import { quoteStore } from "../services/arc-store";
import { validateInput, QuoteRequestSchema } from "../utils/validators";
import { QuoteError } from "../utils/errors";
import { logger } from "../utils/logger";
import { QuoteRequest, QuoteResponse } from "../types";
import { v4 as uuidv4 } from "uuid";

const router = Router();

/**
 * POST /api/quote
 *
 * Get route quotes from multiple providers
 *
 * Request body:
 * {
 *   "sourceChain": "ethereum",
 *   "destinationChain": "polygon",
 *   "sourceToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
 *   "destinationToken": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
 *   "amount": "1000000000",
 *   "userAddress": "0x1234...",
 *   "strategy": "lowest-fee"
 * }
 *
 * Response:
 * {
 *   "transactionId": "uuid-123",
 *   "quotes": [
 *     {
 *       "quoteId": "quote-1",
 *       "providerId": "lifi",
 *       "estimatedOutput": "999000000",
 *       "fees": {...},
 *       "score": 0.95,
 *       ...
 *     }
 *   ],
 *   "selectedQuoteIndex": 0
 * }
 */
router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info("Quote request received", {
        from: req.body.sourceChain,
        to: req.body.destinationChain,
        amount: req.body.amount,
      });

      // Validate request
      const request = validateInput(QuoteRequestSchema, req.body) as QuoteRequest;

      // Generate transaction ID
      const transactionId = uuidv4();

      // Fetch quotes from providers
      const rawQuotes = await quoteEngine.getQuotes(request);

      if (rawQuotes.length === 0) {
        throw new QuoteError("No quotes available from any provider", 503);
      }

      // Score and rank quotes
      const optimizedQuotes = routeOptimizer.scoreQuotes(
        rawQuotes,
        request.strategy || "lowest-fee"
      );

      // Filter acceptable routes
      const acceptableQuotes = rawQuotes.filter((q) =>
        routeOptimizer.isRouteAcceptable(q)
      );

      if (acceptableQuotes.length === 0) {
        throw new QuoteError(
          "No routes meet acceptable thresholds (too much slippage)",
          400
        );
      }

      const optimizedScoreMap = new Map(
        optimizedQuotes.map((route) => [route.quoteId, route.score])
      );

      // Build response
      const response: QuoteResponse = {
        transactionId,
        quotes: acceptableQuotes.map((q) => ({
          ...q,
          score: optimizedScoreMap.get(q.quoteId) ?? 0,
        })),
        selectedQuoteIndex: 0,
        timestamp: Date.now(),
      };

      quoteStore.saveQuoteResponse(
        transactionId,
        request,
        response.quotes,
        response.selectedQuoteIndex
      );

      logger.info("Quote response sent", {
        transactionId,
        quoteCount: response.quotes.length,
        topProvider: response.quotes[0]?.providerId,
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/quote/validate
 *
 * Validate a quote is still valid
 * (Quotes expire after 5 minutes)
 *
 * Request body:
 * {
 *   "quoteId": "quote-123",
 *   "transactionId": "uuid-456"
 * }
 */
router.post(
  "/validate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quoteId, transactionId } = req.body;

      if (!quoteId || !transactionId) {
        throw new QuoteError("Missing quoteId or transactionId", 400);
      }

      logger.info("Quote validation requested", { quoteId, transactionId });

      const validation = quoteStore.validateQuote(transactionId, quoteId);

      res.status(200).json(validation);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
