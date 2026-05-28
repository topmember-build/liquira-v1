/**
 * API hooks for LiQuira backend integration
 */

import { useState, useCallback, useEffect } from "react";

export interface QuoteRequest {
  sourceChain: string;
  destinationChain: string;
  sourceToken: string;
  destinationToken: string;
  amount: string | number;
  userAddress?: string;
  recipientAddress?: string;
  paymentMode?: boolean;
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

export type ExecuteRequest = ExecutePaymentRequest;

export type ExecutionResponse = ExecutePaymentResponse;

export interface ExecutePaymentRequest {
  userId?: string;
  sourceWalletAddress?: string;
  recipientWalletAddress: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  paymentMode?: boolean;
  strategy?: string;
  permit?: Record<string, any>;
}

export interface ExecutePaymentResponse {
  status: string;
  transactionId?: string;
  arcTxHash?: string;
  txHash?: string;
  fromAmount?: string;
  toAmount?: string;
  rate?: string;
  fee?: string;
  error?: string;
}

export interface TransactionStatus {
  id: string;
  status: "pending" | "bridging" | "completed" | "failed" | "confirmed" | "success";
  sourceChain: string;
  destinationChain: string;
  sourceToken: string;
  destinationToken: string;
  sourceAmount: string;
  destinationAmount?: string;
  estimatedOutput: string;
  provider: string;
  txHash?: string;
  explorerUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "";

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
export const useQuote = (request?: QuoteRequest | null) => {
  const [quotes, setQuotes] = useState<NormalizedQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchQuotes = useCallback(
    async (request: QuoteRequest): Promise<NormalizedQuote[] | null> => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          from: request.sourceToken,
          to: request.destinationToken,
          amount: String(request.amount),
        });

        const { data, error: apiError } = await apiClient.request<{
          rate: number;
          fee: number;
          estimatedAmount: number;
        }>(`/fx/quote?${params.toString()}`);

        if (apiError) {
          setError(apiError);
          return null;
        }

        if (data) {
          const quote: NormalizedQuote = {
            quoteId: `liquira-${Date.now()}`,
            providerId: "Liquira FX",
            estimatedOutput: String(data.estimatedAmount),
            fees: {
              gas: "0",
              bridge: "0",
              total: String(data.fee),
            },
            estimatedTime: 45,
            route: [
              {
                type: "swap",
                fromChain: request.sourceChain,
                toChain: request.destinationChain,
                fromToken: request.sourceToken,
                toToken: request.destinationToken,
                fromAmount: String(request.amount),
                toAmount: String(data.estimatedAmount),
              },
            ],
          };

          setQuotes([quote]);
          return [quote];
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const requestJson = request ? JSON.stringify(request) : null;

  useEffect(() => {
    if (!requestJson) return;
    fetchQuotes(JSON.parse(requestJson));
  }, [fetchQuotes, requestJson]);

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
      try {
        const { data, error: apiError } = await apiClient.request<ExecutionResponse>(
          "/fx/execute",
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
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, execute };
};

/**
 * Hook to execute payment requests through FX execution endpoint
 */
export const useExecutePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const executePayment = useCallback(
    async (request: ExecutePaymentRequest): Promise<ExecutePaymentResponse | null> => {
      setLoading(true);
      setError(null);

      const { data, error: apiError } = await apiClient.request<ExecutePaymentResponse>(
        "/fx/execute",
        {
          method: "POST",
          body: JSON.stringify(request),
        }
      );

      setLoading(false);

      if (apiError) {
        setError(apiError);
        return null;
      }

      if (data) {
        return {
          ...data,
          txHash: data.txHash || data.arcTxHash,
        };
      }

      return null;
    },
    []
  );

  return { loading, error, executePayment };
};

/**
 * Hook to fetch transaction status
 */
export const useTransaction = () => {
  const [transaction, setTransaction] = useState<TransactionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  type TransactionPollDetails = {
    transactionId?: string;
    sourceChain?: string;
    destinationChain?: string;
    sourceToken?: string;
    destinationToken?: string;
    sourceAmount?: string | number;
    destinationAmount?: string | number;
    estimatedOutput?: string | number;
    provider?: string;
    txHash?: string;
    arcTxHash?: string;
    circleTransferId?: string;
    explorerUrl?: string;
    errorMessage?: string;
    createdAt?: string;
    updatedAt?: string;
    fromCurrency?: string;
    toCurrency?: string;
    fromAmount?: string | number;
    toAmount?: string | number;
    [key: string]: unknown;
  };

  type TransactionPollResponse = {
    status: string;
    details: TransactionPollDetails;
  };

  const normalizeTransactionResponse = useCallback(
    (response: TransactionPollResponse): TransactionStatus => {
      const details = response.details || {};
      const sourceAmount = details.sourceAmount ?? details.fromAmount ?? "";
      const destinationAmount = details.destinationAmount ?? details.toAmount ?? "";
      const estimatedOutput =
        details.estimatedOutput ?? details.toAmount ?? details.destinationAmount ?? "";

      return {
        id: details.transactionId || "",
        status: response.status as TransactionStatus["status"],
        sourceChain: details.sourceChain || "arc-testnet",
        destinationChain: details.destinationChain || "arc-testnet",
        sourceToken: details.sourceToken || details.fromCurrency || "",
        destinationToken: details.destinationToken || details.toCurrency || "",
        sourceAmount: String(sourceAmount),
        destinationAmount: String(destinationAmount),
        estimatedOutput: String(estimatedOutput),
        provider: details.provider || "Liquira FX",
        txHash: details.txHash || details.arcTxHash || details.circleTransferId,
        explorerUrl: details.explorerUrl,
        errorMessage: details.errorMessage,
        createdAt: details.createdAt || new Date().toISOString(),
        updatedAt: details.updatedAt || new Date().toISOString(),
      };
    },
    []
  );

  const fetchTransaction = useCallback(async (transactionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await apiClient.request<TransactionPollResponse>(
        `/tx/${encodeURIComponent(transactionId)}`
      );

      if (apiError) {
        setError(apiError);
        return null;
      }

      if (data) {
        const normalized = normalizeTransactionResponse(data);
        setTransaction(normalized);
        return normalized;
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [normalizeTransactionResponse]);

  const pollTransaction = useCallback(
    async (transactionId: string, intervalMs = 3000, maxDurationMs = 600000) => {
      const startTime = Date.now();
      const terminalStatuses = ["completed", "success", "failed", "confirmed"];

      return new Promise<TransactionStatus | null>((resolve) => {
        const interval = setInterval(async () => {
          const tx = await fetchTransaction(transactionId);

          if (tx && terminalStatuses.includes(tx.status)) {
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
export interface TransactionHistoryResponse {
  transactions: TransactionStatus[];
  total: number;
  limit: number;
  offset: number;
}

export const useTransactionHistory = () => {
  const [transactions, setTransactions] = useState<TransactionStatus[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchHistory = useCallback(
    async (
      userId?: string,
      walletAddress?: string,
      limit = 10,
      offset = 0,
      status?: string,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        });

        if (userId) params.set("userId", userId);
        if (walletAddress) params.set("walletAddress", walletAddress);
        if (status) params.set("status", status);

        const { data, error: apiError } = await apiClient.request<TransactionHistoryResponse>(
          `/tx?${params.toString()}`
        );

        if (apiError) {
          setError(apiError);
          return null;
        }

        if (data) {
          const payload = Array.isArray(data)
            ? { transactions: data, total: data.length }
            : data;

          setTransactions(payload.transactions || []);
          setTotal(payload.total ?? payload.transactions?.length ?? 0);
          return payload;
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { transactions, total, loading, error, fetchHistory };
};
