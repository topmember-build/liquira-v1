/**
 * Express Server Initialization
 *
 * Sets up the Express server with middleware, routes, and error handling
 * This is the entry point for the backend
 */

import express, { Express, Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import cors from "cors";
const moduleAlias = require("module-alias");
import { CONFIGURATION } from "./config/environment";
import { logger } from "./utils/logger";
import { formatErrorResponse } from "./utils/errors";

const distRoot = path.resolve(process.cwd(), "dist");
moduleAlias.addAlias("@", distRoot);

// Import route handlers (will be created next)
// import quoteRoutes from "./routes/quote.routes";
// import executeRoutes from "./routes/execute.routes";
// import transactionRoutes from "./routes/transaction.routes";
// import webhookRoutes from "./routes/webhook.routes";
// import healthRoutes from "./routes/health.routes";

/**
 * Initialize Express app
 */
export async function createApp(): Promise<Express> {
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
  try {
    // Mount API routers if present
    // Importing here avoids startup errors when files are missing in some environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const quoteRoutes = require("./routes/quote.routes").default;
    const executeRoutes = require("./routes/execute.routes").default;
    const transactionRoutes = require("./routes/transaction.routes").default;
    const webhookRoutes = require("./routes/webhook.routes").default;

    app.use("/api/quote", quoteRoutes);
    app.use("/api/execute", executeRoutes);
    app.use("/api/transaction", transactionRoutes);
    app.use("/api/webhooks", webhookRoutes);
  } catch (err) {
    logger.warn("Backend routes not mounted (some route files may be missing)", { error: err instanceof Error ? err.message : String(err) });
  }

  // Execute routes (POST /api/execute)
  // app.use("/api/execute", executeRoutes);

  // Transaction routes (GET /api/transaction/:id)
  // app.use("/api/transaction", transactionRoutes);

  // Webhook routes (POST /api/webhooks/execution)
  // app.use("/api/webhooks", webhookRoutes);

  // AI Layer routes (POST /api/ai/*)
  try {
    app.use("/api/ai", require("./routes/ai").default);
  } catch (err) {
    logger.warn("AI routes not mounted (ai route missing)", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // React Start server functions proxy route
  const serverEntryPath = path.join(process.cwd(), "dist", "server", "index.js");
  if (fs.existsSync(serverEntryPath)) {
    try {
      const importModule = new Function("path", "return import(path);") as (path: string) => Promise<any>;
      const serverEntryModule = await importModule(pathToFileURL(serverEntryPath).href);
      const serverEntry = serverEntryModule.default ?? serverEntryModule;
      const fetchHandler = typeof serverEntry.fetch === "function" ? serverEntry.fetch : undefined;

      if (typeof fetchHandler === "function") {
        app.all(/^\/_serverFn\/.*$/, async (req: Request, res: Response, next: NextFunction) => {
          try {
            const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (typeof value === "undefined") continue;
              if (Array.isArray(value)) {
                headers.set(key, value.join(","));
              } else {
                headers.set(key, value);
              }
            }

            const body = req.method === "GET" || req.method === "HEAD" ? undefined : typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
            const request = new Request(url, {
              method: req.method,
              headers,
              body,
            });

            const response = await fetchHandler(request);
            res.status(response.status);
            response.headers.forEach((value: string, key: string) => res.setHeader(key, value));
            const responseBody = await response.arrayBuffer();
            if (responseBody.byteLength > 0) {
              res.send(Buffer.from(responseBody));
            } else {
              res.end();
            }
          } catch (err) {
            next(err);
          }
        });
      } else {
        logger.warn("React Start server entry is missing a fetch handler", { serverEntryPath });
      }
    } catch (err) {
      logger.warn("Failed to mount React Start server functions", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    logger.info("React Start server entry not found; skipping /_serverFn proxy", { serverEntryPath });
  }

  // Serve built frontend (if present) so backend can be the single deployable unit
  const distPath = path.join(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // SPA fallback: serve index.html for non-API GETs
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
      const indexHtml = path.join(distPath, "index.html");
      if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
      return next();
    });
  } else {
    logger.info("Frontend dist directory not found; skipping static file serving", { distPath });
  }

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
  const app = await createApp();

  app.listen(CONFIGURATION.PORT, CONFIGURATION.HOST, () => {
    logger.info(`Server started`, {
      url: `http://${CONFIGURATION.HOST}:${CONFIGURATION.PORT}`,
      environment: CONFIGURATION.NODE_ENV,
    });
  });
}

// Run if this is the main module (CommonJS-compatible)
if (require.main === module) {
  startServer().catch((err) => {
    logger.error("Failed to start server", { error: err.message });
    process.exit(1);
  });
}

export default createApp;
