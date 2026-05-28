/**
 * Core type definitions for LiQuira routing engine
 * These types ensure type safety across all modules
 */

// ============ QUOTE TYPES ============

export interface QuoteRequest {
  sourceChain: string; // e.g., "ethereum", "polygon"
  destinationChain: string;
  sourceToken: string; // Token address (0x...)
  destinationToken: string;
  amount: string; // Amount in smallest unit (wei)
  userAddress: string; // User's wallet address
  strategy?: "lowest-fee" | "fastest" | "lowest-slippage";
}

export interface RouteStep {
  id: string;
  type: "swap" | "bridge" | "approval";
  from: {
    token: string;
    chain: string;
    amount: string;
  };
  to: {
    token: string;
    chain: string;
  };
  provider?: string; // Provider that will execute (selected at runtime)
  minOutput?: string; // Minimum output acceptable (slippage protection)
}

export interface ProviderQuote {
  providerId: "lifi" | "socket" | "relay";
  estimatedOutput: string; // Output amount in wei
  estimatedOutputUSD?: number; // For display purposes
  fees: {
    gasFee: string;
    bridgeFee: string;
    slippagePercent: number;
    total: string;
  };
  estimatedTime: number; // Seconds
  route: RouteStep[];
  rawResponse: any; // Store original provider response for debugging
}

export interface NormalizedQuote extends ProviderQuote {
  quoteId: string;
  score: number; // 0-1, where 1 is best
  arcPayload: ARCExecutionPayload;
}

export interface QuoteResponse {
  transactionId: string;
  quotes: NormalizedQuote[];
  selectedQuoteIndex: number;
  timestamp: number;
}

// ============ ROUTE TYPES ============

export interface RouteRecord {
  id: string;
  transactionId: string;
  providerId: string;
  route: RouteStep[];
  executionPlan: ExecutionPlan;
  estimatedOutput: string;
  estimatedFees: string;
  estimatedTime: number;
  slippagePercent: number;
  selected: boolean;
  createdAt: Date;
}

export interface ExecutionPlan {
  id: string;
  routeId: string;
  transactionId: string;
  steps: ExecutionStep[];
  arcPayload: ARCExecutionPayload;
}

export interface ExecutionStep {
  id: string;
  type: "token-approval" | "swap" | "bridge" | "wait";
  status: "pending" | "completed" | "failed";
  data: any;
  estimatedTime: number;
}

// ============ TRANSACTION TYPES ============

export type TransactionStatus = "pending" | "routed" | "executing" | "completed" | "failed";

export interface Transaction {
  id: string;
  userId: string;
  sourceChain: string;
  destinationChain: string;
  sourceToken: string;
  destinationToken: string;
  sourceAmount: string;
  selectedQuote?: NormalizedQuote;
  status: TransactionStatus;
  routeId?: string;
  executionPlanId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface TransactionResponse {
  id: string;
  status: TransactionStatus;
  sourceChain: string;
  destinationChain: string;
  sourceAmount: string;
  estimatedOutput?: string;
  progress?: {
    currentStep: number;
    totalSteps: number;
    stepStatus: string;
  };
  completedAt?: Date;
  error?: string;
}

// ============ ARC TYPES ============

/**
 * ARC Execution Payload
 *
 * This is the format ARC expects. We remain execution-agnostic:
 * - We define WHAT needs to happen (swap, bridge, approvals)
 * - ARC decides HOW and WHERE (provider selection at runtime)
 * - ARC has access to liquidity and provider infrastructure
 */
export interface ARCExecutionPayload {
  version: "1.0";
  routeId: string;
  transactionId: string;
  recipient: string; // Final destination wallet
  sourceChain: string;
  destinationChain: string;
  steps: ARCExecutionStep[];
  deadline: number; // Unix timestamp for execution deadline
  metadata?: {
    quoteId?: string;
    optimizationStrategy?: string;
    maxSlippage?: number;
  };
}

export interface ARCExecutionStep {
  id: string;
  type: "swap" | "bridge" | "approval";
  chainId: number;

  // For swaps
  swapData?: {
    tokenIn: string; // Contract address
    tokenOut: string;
    amountIn: string; // Wei
    minAmountOut: string; // Wei (slippage protection)
    deadline: number; // Unix timestamp
    // ARC will select DEX at runtime
  };

  // For bridges
  bridgeData?: {
    token: string;
    amount: string; // Wei
    destinationChain: string;
    recipient: string;
    // ARC will select bridge provider at runtime
  };

  // For approvals
  approvalData?: {
    token: string;
    spender: string; // Usually ARC contract address
    amount: string;
  };
}

export interface ARCExecutionCallback {
  transactionId: string;
  status: "initiated" | "executing" | "completed" | "failed";
  currentStep?: number;
  totalSteps?: number;
  finalOutput?: string;
  completedAt?: string;
  txHash?: string;
  error?: string;
}

// ============ ERROR TYPES ============

export interface APIError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export class QuoteError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

export class RouteError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = "RouteError";
  }
}

export class ExecutionError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = "ExecutionError";
  }
}

// ============ PROVIDER-SPECIFIC TYPES ============

/**
 * LI.FI Response (example of raw provider response)
 */
export interface LiFiQuoteResponse {
  id: string;
  type: string;
  tool: string;
  action: any;
  estimate: {
    tool: string;
    approvalAddress: string;
    executionDuration: number;
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    gasCosts: any[];
    feeCosts: any[];
    amount: string;
    fromAmountUSD: string;
    toAmountUSD: string;
  };
  includedSteps: Array<{
    tool: string;
    toolDetails: any;
    action: any;
  }>;
}

/**
 * Socket Response (example)
 */
export interface SocketQuoteResponse {
  result: {
    routes: Array<{
      routeId: string;
      isOnlySwapRoute: boolean;
      fromChain: number;
      toChain: number;
      userTxIndex: number;
      totalUserTx: number;
      sender: string;
      recipient: string;
      totalDurationInSeconds: number;
      outputValueInUsd: string;
      outputAmount: string;
      maxSlippage: string;
      priceImpactPercent: string;
      steps: any[];
    }>;
  };
}

// ============ DATABASE TYPES ============

export interface TransactionRecord {
  id: string;
  user_id: string;
  source_chain: string;
  destination_chain: string;
  source_token: string;
  destination_token: string;
  source_amount: string;
  status: TransactionStatus;
  route_id?: string;
  execution_plan_id?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  error_message?: string;
}

export interface RouteRecord_DB {
  id: string;
  transaction_id: string;
  provider_id: string;
  route_data: any; // JSONB
  execution_steps: any; // JSONB
  estimated_output: string;
  estimated_fees: string;
  estimated_time: number;
  slippage_percent: number;
  created_at: Date;
}

export interface QuoteRecord_DB {
  id: string;
  transaction_id: string;
  provider_id: string;
  quote_data: any; // JSONB
  created_at: Date;
}

export interface ExecutionLogRecord {
  id: string;
  transaction_id: string;
  event: "initiated" | "executing" | "completed" | "failed";
  provider_response: any; // JSONB
  created_at: Date;
}
