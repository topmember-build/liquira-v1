/**
 * Express Server Initialization
 *
 * Sets up the Express server with middleware, routes, and error handling
 * This is the entry point for the backend
 */

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { CONFIGURATION } from "./config/environment";
import { logger } from "./utils/logger";
import { formatErrorResponse } from "./utils/errors";

// Import route handlers (will be created next)
// import quoteRoutes from "./routes/quote.routes";
// import executeRoutes from "./routes/execute.routes";
// import transactionRoutes from "./routes/transaction.routes";
// import webhookRoutes from "./routes/webhook.routes";
// import healthRoutes from "./routes/health.routes";

/**
 * Initialize Express app
 */
export function createApp(): Express {
  const app = express();

  // ============ MIDDLEWARE ============

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // CORS
  app.use(
    cors({
      origin: CONFIGURATION.CORS_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    });
    next();
  });

  // ============ ROUTES ============

  // Health check
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: CONFIGURATION.NODE_ENV,
    });
  });

  // Quote routes (POST /api/quote)
  // app.use("/api/quote", quoteRoutes);

  // Execute routes (POST /api/execute)
  // app.use("/api/execute", executeRoutes);

  // Transaction routes (GET /api/transaction/:id)
  // app.use("/api/transaction", transactionRoutes);

  // Webhook routes (POST /api/webhooks/execution)
  // app.use("/api/webhooks", webhookRoutes);

  // AI Layer routes (POST /api/ai/*)
  app.use("/api/ai", require("./routes/ai").default);

  // ============ ERROR HANDLING ============

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `Route not found: ${req.method} ${req.path}`,
      },
    });
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error("Request error", {
      path: req.path,
      method: req.method,
      error: err.message,
    });

    const { statusCode, body } = formatErrorResponse(err);
    res.status(statusCode).json(body);
  });

  return app;
}

/**
 * Start the server
 */
export async function startServer(): Promise<void> {
  const app = createApp();

  app.listen(CONFIGURATION.PORT, CONFIGURATION.HOST, () => {
    logger.info(`Server started`, {
      url: `http://${CONFIGURATION.HOST}:${CONFIGURATION.PORT}`,
      environment: CONFIGURATION.NODE_ENV,
    });
  });
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    logger.error("Failed to start server", { error: err.message });
    process.exit(1);
  });
}

export default createApp;
