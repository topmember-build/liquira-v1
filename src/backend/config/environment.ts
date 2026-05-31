/**
 * Environment configuration and validation
 * Loads and validates all environment variables
 */

import { z } from "zod";

// Zod schema for environment variables
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Server configuration
  PORT: z.string().transform(Number).default("3000"),
  HOST: z.string().default("localhost"),

  // Database configuration (optional - app works with in-memory fallback)
  DATABASE_URL: z.string().url().optional(),
  DATABASE_HOST: z.string().optional(),
  DATABASE_PORT: z.string().transform(Number).optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_USER: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),

  // Provider API keys
  LIFI_API_KEY: z.string().optional(),
  SOCKET_API_KEY: z.string().optional(),
  RELAY_API_KEY: z.string().optional(),

  // Circle treasury / stable FX config
  CIRCLE_API_KEY: z.string().optional(),
  CIRCLE_WALLET_ID: z.string().optional(),
  CIRCLE_DESTINATION_ADDRESS: z.string().optional(),
  CIRCLE_ENTITY_SECRET: z.string().optional(),
  CIRCLE_DESTINATION_BLOCKCHAIN: z.string().optional(),
  CIRCLE_STABLE_FX_ENABLED: z.string().transform((v) => v === "true").default("false"),

  // Frontend configuration (for CORS)
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),

  // ARC configuration (optional for local development)
  ARC_ADDRESS: z.string().optional(),
  ARC_WEBHOOK_SECRET: z.string().optional(),
  ARC_MOCK_MODE: z.string().transform((v) => v === "true").default("false"),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Feature flags
  ENABLE_LIFI: z.string().transform((v) => v === "true").default("true"),
  ENABLE_SOCKET: z.string().transform((v) => v === "true").default("true"),
  ENABLE_RELAY: z.string().transform((v) => v === "true").default("false"),
});

type Environment = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
export function getConfig(): Environment {
  const config = envSchema.parse(process.env);
  return config;
}

// Export configuration
export const config = getConfig();

// Export configuration constants
export const CONFIGURATION = {
  // Server
  PORT: config.PORT,
  HOST: config.HOST,
  NODE_ENV: config.NODE_ENV,
  isDevelopment: config.NODE_ENV === "development",
  isProduction: config.NODE_ENV === "production",

  // Database (optional)
  DATABASE_URL: config.DATABASE_URL,

  // Providers
  PROVIDERS: {
    LIFI: {
      enabled: config.ENABLE_LIFI,
      apiKey: config.LIFI_API_KEY,
      baseUrl: "https://li.quest/v1",
      timeout: 30000,
    },
    SOCKET: {
      enabled: config.ENABLE_SOCKET,
      apiKey: config.SOCKET_API_KEY,
      baseUrl: "https://api.socket.tech/v1",
      timeout: 30000,
    },
    RELAY: {
      enabled: config.ENABLE_RELAY,
      apiKey: config.RELAY_API_KEY,
      baseUrl: "https://api.relayer.xyz/v1",
      timeout: 30000,
    },
  },

  // Circle
  CIRCLE: {
    apiKey: config.CIRCLE_API_KEY,
    walletId: config.CIRCLE_WALLET_ID,
    destinationAddress: config.CIRCLE_DESTINATION_ADDRESS,
    entitySecret: config.CIRCLE_ENTITY_SECRET,
    destinationBlockchain: config.CIRCLE_DESTINATION_BLOCKCHAIN,
    stableFxEnabled: config.CIRCLE_STABLE_FX_ENABLED,
  },

  // Frontend
  FRONTEND_URL: config.FRONTEND_URL,
  CORS_ORIGIN: config.FRONTEND_URL,

  // ARC (optional)
  ARC_ADDRESS: config.ARC_ADDRESS,
  ARC_WEBHOOK_SECRET: config.ARC_WEBHOOK_SECRET,

  // Logging
  LOG_LEVEL: config.LOG_LEVEL,

  // Route optimization
  ROUTE_OPTIMIZER: {
    FEE_WEIGHT: 0.5,
    TIME_WEIGHT: 0.3,
    SLIPPAGE_WEIGHT: 0.2,
    MAX_ACCEPTABLE_SLIPPAGE: 0.01, // 1%
  },

  // Rate limiting
  RATE_LIMIT: {
    QUOTE_PER_MINUTE: 30,
    EXECUTE_PER_MINUTE: 10,
  },

  // Execution settings
  EXECUTION: {
    MAX_ROUTE_AGE_MINUTES: 5, // Routes expire after 5 minutes
    EXECUTION_TIMEOUT_SECONDS: 3600, // 1 hour timeout
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 5000,
    allowMockArcSettlement: config.ARC_MOCK_MODE,
  },
};

export default CONFIGURATION;
