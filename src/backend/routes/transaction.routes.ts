/**
 * Transaction Routes
 *
 * Endpoints:
 * - GET /api/transaction/:id - Get transaction details and status
 * - GET /api/transaction - List user's transactions
 */

import { Router, Request, Response, NextFunction } from "express";
import { NotFoundError } from "../utils/errors";
import { logger } from "../utils/logger";
import { TransactionResponse } from "../types";

const router = Router();

/**
 * GET /api/transaction/:id
 *
 * Get transaction details and current status
 *
 * Response:
 * {
 *   "id": "uuid-123",
 *   "status": "executing",
 *   "sourceChain": "ethereum",
 *   "destinationChain": "polygon",
 *   "sourceAmount": "1000000000",
 *   "estimatedOutput": "999000000",
 *   "progress": {
 *     "currentStep": 2,
 *     "totalSteps": 3,
 *     "stepStatus": "bridging"
 *   },
 *   "createdAt": "2026-05-09T10:00:00Z",
 *   "updatedAt": "2026-05-09T10:05:00Z",
 *   "completedAt": null,
 *   "error": null
 * }
 */
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      logger.info("Transaction details requested", { transactionId: id });

      // TODO: Implement transaction lookup
      // 1. Validate ID format
      // 2. Fetch transaction from database
      // 3. Fetch associated execution logs
      // 4. Build response with current status and progress

      const response: TransactionResponse = {
        id,
        status: "pending",
        sourceChain: "ethereum",
        destinationChain: "polygon",
        sourceAmount: "1000000000",
        estimatedOutput: "999000000",
        progress: {
          currentStep: 0,
          totalSteps: 3,
          stepStatus: "pending",
        },
        completedAt: undefined,
        error: undefined,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/transaction?userId=:userId&limit=10
 *
 * List user's transactions with pagination
 *
 * Query parameters:
 * - userId (required) - User ID
 * - limit (optional, default 20) - Number of transactions to return
 * - offset (optional, default 0) - Pagination offset
 *
 * Response:
 * {
 *   "transactions": [...],
 *   "total": 42,
 *   "limit": 20,
 *   "offset": 0
 * }
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, limit = "20", offset = "0" } = req.query;

      if (!userId) {
        throw new NotFoundError("userId query parameter is required");
      }

      logger.info("User transactions requested", {
        userId,
        limit,
        offset,
      });

      // TODO: Implement transaction list
      // 1. Validate pagination parameters
      // 2. Fetch transactions for user from database
      // 3. Calculate total count
      // 4. Return paginated results

      const response = {
        transactions: [],
        total: 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
