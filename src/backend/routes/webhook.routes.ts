/**
 * Webhook Routes
 *
 * Endpoints:
 * - POST /api/webhooks/execution - Receive execution updates from ARC
 * - POST /api/webhooks/verify - Verify webhook authenticity
 */

import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { validateInput, ArcWebhookSchema } from "../utils/validators";
import { ExecutionError } from "../utils/errors";
import { logger } from "../utils/logger";
import { CONFIGURATION } from "../config/environment";
import { ARCExecutionCallback } from "../types";

const router = Router();

/**
 * Verify webhook signature
 *
 * ARC sends a signature header for verification
 * Signature = HMAC-SHA256(secret, body)
 */
function verifyWebhookSignature(
  body: string,
  signature: string | undefined
): boolean {
  if (!signature) {
    logger.warn("Webhook verification: No signature provided");
    return false;
  }

  if (!CONFIGURATION.ARC_WEBHOOK_SECRET) {
    logger.warn("Webhook verification: missing ARC_WEBHOOK_SECRET");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", CONFIGURATION.ARC_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * POST /api/webhooks/execution
 *
 * Receive execution updates from ARC
 * This is called by ARC when transactions complete or fail
 *
 * Request body:
 * {
 *   "transactionId": "uuid-123",
 *   "status": "completed",
 *   "currentStep": 3,
 *   "totalSteps": 3,
 *   "finalOutput": "999000000",
 *   "completedAt": "2026-05-09T10:30:00Z",
 *   "txHash": "0x...",
 *   "error": null
 * }
 *
 * Response:
 * {
 *   "received": true,
 *   "transactionId": "uuid-123"
 * }
 */
router.post(
  "/execution",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info("ARC execution webhook received", {
        transactionId: req.body.transactionId,
      });

      // Verify webhook signature
      const rawBody = JSON.stringify(req.body);
      const signature = req.headers["x-arc-signature"] as string | undefined;

      if (
        CONFIGURATION.NODE_ENV === "production" &&
        !verifyWebhookSignature(rawBody, signature)
      ) {
        throw new ExecutionError("Invalid webhook signature", 401);
      }

      // Validate webhook data
      const callback = validateInput(
        ArcWebhookSchema,
        req.body
      ) as ARCExecutionCallback;

      logger.info("ARC webhook verified", {
        transactionId: callback.transactionId,
        status: callback.status,
      });

      // TODO: Implement webhook handling
      // 1. Update transaction status in database
      // 2. Store execution log entry
      // 3. Handle different status types:
      //    - "initiated": Execution started
      //    - "executing": In progress
      //    - "completed": Success - update final output
      //    - "failed": Error - store error message
      // 4. Trigger frontend notifications (if using WebSockets)
      // 5. Call any post-execution handlers (e.g., settlement confirmation)

      const response = {
        received: true,
        transactionId: callback.transactionId,
        processedAt: new Date().toISOString(),
      };

      logger.info("ARC webhook processed", response);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/webhooks/verify
 *
 * Test webhook connectivity
 * ARC uses this to verify the webhook endpoint is working
 *
 * Request body:
 * {
 *   "test": true
 * }
 *
 * Response:
 * {
 *   "status": "ok",
 *   "message": "Webhook endpoint is reachable"
 * }
 */
router.post(
  "/verify",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info("Webhook verification request received");

      res.status(200).json({
        status: "ok",
        message: "Webhook endpoint is reachable",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
