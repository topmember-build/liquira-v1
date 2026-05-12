/**
 * API hooks for LiQuira backend integration
 */

import { useState, useCallback } from "react";

export interface QuoteRequest {
  sourceChain: string;
  destinationChain: string;
  sourceToken: string;
  destinationToken: string;
  amount: string;
  userAddress: string;
  strategy?: "lowest-fee" | "fastest" | "lowest-slippage";
}

export interface RouteStep {
  type: "swap" | "bridge" | "approval";
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
}

export interface NormalizedQuote {
  quoteId: string;
  providerId: string;
  estimatedOutput: string;
  fees: {
    gas: string;
    bridge: string;
    total: string;
  };
  estimatedTime: number; // seconds
  route: RouteStep[];
  score?: number;
  rank?: number;
  recommended?: boolean;
}

export interface ExecuteRequest {
  transactionId: string;
  quoteId: string;
  userAddress: string;
  signature: string;
}

export interface ExecutionResponse {
  executionId: string;
  status: "executing" | "pending";
  arcPayload: any;
  estimatedCompletionTime: number;
}

export interface TransactionStatus {
  id: string;
  status: "pending" | "bridging" | "completed" | "failed";
  sourceChain: string;
  destinationChain: string;
  sourceToken: string;
  destinationToken: string;
  sourceAmount: string;
  destinationAmount?: string;
  estimatedOutput: string;
  provider: string;
  txHash?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<{ data?: T; error?: ApiError }> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: {
            message: errorData.message || `HTTP ${response.status}`,
            code: errorData.code,
            details: errorData,
          },
        };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          details: error,
        },
      };
    }
  }
}

const apiClient = new ApiClient(API_BASE_URL);

/**
 * Hook to fetch quotes from backend
 */
export const useQuote = () => {
  const [quotes, setQuotes] = useState<NormalizedQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchQuotes = useCallback(
    async (request: QuoteRequest): Promise<NormalizedQuote[] | null> => {
      setLoading(true);
      setError(null);

      const { data, error: apiError } = await apiClient.request<NormalizedQuote[]>(
        "/api/quote",
        {
          method: "POST",
          body: JSON.stringify(request),
        }
      );

      if (apiError) {
        setError(apiError);
        return null;
      }

      if (data) {
        setQuotes(data);
        return data;
      }

      return null;
    },
    []
  );

  return { quotes, loading, error, fetchQuotes };
};

/**
 * Hook to execute a route
 */
export const useExecute = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(
    async (request: ExecuteRequest): Promise<ExecutionResponse | null> => {
      setLoading(true);
      setError(null);

      const { data, error: apiError } = await apiClient.request<ExecutionResponse>(
        "/api/execute",
        {
          method: "POST",
          body: JSON.stringify(request),
        }
      );

      if (apiError) {
        setError(apiError);
        return null;
      }

      return data || null;
    },
    []
  );

  return { loading, error, execute };
};

/**
 * Hook to fetch transaction status
 */
export const useTransaction = () => {
  const [transaction, setTransaction] = useState<TransactionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchTransaction = useCallback(async (transactionId: string) => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await apiClient.request<TransactionStatus>(
      `/api/transaction/${transactionId}`
    );

    if (apiError) {
      setError(apiError);
      return null;
    }

    if (data) {
      setTransaction(data);
      return data;
    }

    return null;
  }, []);

  const pollTransaction = useCallback(
    async (transactionId: string, intervalMs = 3000, maxDurationMs = 600000) => {
      const startTime = Date.now();

      return new Promise<TransactionStatus | null>((resolve) => {
        const interval = setInterval(async () => {
          const tx = await fetchTransaction(transactionId);

          if (tx?.status === "completed" || tx?.status === "failed") {
            clearInterval(interval);
            resolve(tx);
            return;
          }

          if (Date.now() - startTime > maxDurationMs) {
            clearInterval(interval);
            resolve(tx);
            return;
          }
        }, intervalMs);
      });
    },
    [fetchTransaction]
  );

  return { transaction, loading, error, fetchTransaction, pollTransaction };
};

/**
 * Hook to fetch transaction history
 */
export const useTransactionHistory = () => {
  const [transactions, setTransactions] = useState<TransactionStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchHistory = useCallback(
    async (userId: string, limit = 10, offset = 0) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        userId,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const { data, error: apiError } = await apiClient.request<TransactionStatus[]>(
        `/api/transaction?${params.toString()}`
      );

      if (apiError) {
        setError(apiError);
        return null;
      }

      if (data) {
        setTransactions(data);
        return data;
      }

      return null;
    },
    []
  );

  return { transactions, loading, error, fetchHistory };
};
