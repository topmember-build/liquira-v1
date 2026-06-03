import { v4 as uuidv4 } from "uuid";
import { CONFIGURATION } from "../config/environment";
import { NormalizedQuote, QuoteRequest, ARCExecutionCallback } from "../types";
import { logger } from "../utils/logger";

export interface QuoteValidationResult {
  valid: boolean;
  message: string;
  quote?: NormalizedQuote;
  ageSeconds?: number;
  expiresInSeconds?: number;
}

interface QuoteCacheEntry {
  transactionId: string;
  request: QuoteRequest;
  createdAt: number;
  quotes: NormalizedQuote[];
  selectedQuoteIndex: number;
}

interface ExecutionRecord {
  executionId: string;
  transactionId: string;
  quoteId: string;
  status: "initiated" | "executing" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
  arcPayload: any;
  currentStep?: number;
  totalSteps?: number;
  finalOutput?: string;
  txHash?: string;
  error?: string;
  history: Array<{ status: string; updatedAt: string }>;
}

const quoteCache = new Map<string, QuoteCacheEntry>();
const executionRecords = new Map<string, ExecutionRecord>();
const transactionIndex = new Map<string, string>();

export const quoteStore = {
  saveQuoteResponse,
  getQuote,
  getQuoteEntry,
  validateQuote,
};

export const executionStore = {
  createExecution,
  getExecution,
  getExecutionByTransactionId,
  updateFromWebhook,
};

function saveQuoteResponse(
  transactionId: string,
  request: QuoteRequest,
  quotes: NormalizedQuote[],
  selectedQuoteIndex: number
) {
  quoteCache.set(transactionId, {
    transactionId,
    request,
    createdAt: Date.now(),
    quotes,
    selectedQuoteIndex,
  });
  logger.debug("Quote cache saved", { transactionId, quoteCount: quotes.length });
}

function getQuote(transactionId: string, quoteId: string): NormalizedQuote | undefined {
  const entry = quoteCache.get(transactionId);
  return entry?.quotes.find((quote) => quote.quoteId === quoteId);
}

function getQuoteEntry(transactionId: string): QuoteCacheEntry | undefined {
  return quoteCache.get(transactionId);
}

function validateQuote(transactionId: string, quoteId: string): QuoteValidationResult {
  const entry = quoteCache.get(transactionId);
  if (!entry) {
    return {
      valid: false,
      message: "Quote transaction not found or expired",
    };
  }

  const quote = entry.quotes.find((item) => item.quoteId === quoteId);
  if (!quote) {
    return {
      valid: false,
      message: "Quote ID does not match any stored quote",
    };
  }

  const ageMs = Date.now() - entry.createdAt;
  const maxAgeMs = CONFIGURATION.EXECUTION.MAX_ROUTE_AGE_MINUTES * 60 * 1000;
  const expiresInMs = maxAgeMs - ageMs;

  if (expiresInMs <= 0) {
    return {
      valid: false,
      message: "Quote has expired",
      ageSeconds: Math.round(ageMs / 1000),
      expiresInSeconds: 0,
    };
  }

  return {
    valid: true,
    message: "Quote is still valid",
    quote,
    ageSeconds: Math.round(ageMs / 1000),
    expiresInSeconds: Math.round(expiresInMs / 1000),
  };
}

function createExecution(transactionId: string, quoteId: string, arcPayload: any) {
  const executionId = uuidv4();
  const execution: ExecutionRecord = {
    executionId,
    transactionId,
    quoteId,
    status: "executing",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    arcPayload,
    history: [
      {
        status: "executing",
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  executionRecords.set(executionId, execution);
  transactionIndex.set(transactionId, executionId);

  logger.debug("Execution created", {
    executionId,
    transactionId,
    quoteId,
  });

  return execution;
}

function getExecution(executionId: string): ExecutionRecord | undefined {
  return executionRecords.get(executionId);
}

function getExecutionByTransactionId(transactionId: string): ExecutionRecord | undefined {
  const executionId = transactionIndex.get(transactionId);
  return executionId ? executionRecords.get(executionId) : undefined;
}

function updateFromWebhook(callback: ARCExecutionCallback): ExecutionRecord | undefined {
  const execution = getExecutionByTransactionId(callback.transactionId);
  if (!execution) {
    logger.warn("Incoming webhook has no matching execution record", {
      transactionId: callback.transactionId,
    });
    return undefined;
  }

  execution.status = callback.status;
  execution.updatedAt = Date.now();
  execution.currentStep = callback.currentStep;
  execution.totalSteps = callback.totalSteps;
  execution.finalOutput = callback.finalOutput;
  execution.txHash = callback.txHash;
  execution.error = callback.error;
  execution.history.push({
    status: callback.status,
    updatedAt: new Date().toISOString(),
  });

  logger.debug("Execution record updated from webhook", {
    executionId: execution.executionId,
    transactionId: execution.transactionId,
    status: execution.status,
  });

  return execution;
}
