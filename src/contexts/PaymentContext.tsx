/**
 * Payment context for managing payment flow state
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { NormalizedQuote, TransactionStatus } from "@/hooks/useBackendAPI";

export interface PaymentFormData {
  sourceChain: string;
  destinationChain: string;
  sourceToken: string;
  destinationToken: string;
  amount: string;
  recipientAddress: string;
  strategy: "lowest-fee" | "fastest" | "lowest-slippage";
}

export interface PaymentContextType {
  // Form state
  formData: PaymentFormData;
  setFormData: (data: PaymentFormData) => void;
  updateFormData: (data: Partial<PaymentFormData>) => void;
  resetFormData: () => void;

  // Quote state
  quotes: NormalizedQuote[];
  setQuotes: (quotes: NormalizedQuote[]) => void;
  selectedQuote: NormalizedQuote | null;
  setSelectedQuote: (quote: NormalizedQuote) => void;

  // Transaction state
  transaction: TransactionStatus | null;
  setTransaction: (transaction: TransactionStatus | null) => void;

  // UI state
  isLoadingQuotes: boolean;
  setIsLoadingQuotes: (loading: boolean) => void;
  isExecuting: boolean;
  setIsExecuting: (executing: boolean) => void;
  quoteError: string | null;
  setQuoteError: (error: string | null) => void;
  executionError: string | null;
  setExecutionError: (error: string | null) => void;

  // Step tracking
  currentStep: "form" | "quotes" | "confirm" | "executing" | "complete";
  setCurrentStep: (step: "form" | "quotes" | "confirm" | "executing" | "complete") => void;

  // Actions
  resetPayment: () => void;
}

const defaultFormData: PaymentFormData = {
  sourceChain: "",
  destinationChain: "",
  sourceToken: "",
  destinationToken: "",
  amount: "",
  recipientAddress: "",
  strategy: "lowest-fee",
};

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

/**
 * Provider component
 */
export const PaymentProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useState<PaymentFormData>(defaultFormData);
  const [quotes, setQuotes] = useState<NormalizedQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<NormalizedQuote | null>(null);
  const [transaction, setTransaction] = useState<TransactionStatus | null>(null);

  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<"form" | "quotes" | "confirm" | "executing" | "complete">(
    "form"
  );

  const updateFormData = useCallback((data: Partial<PaymentFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const resetFormData = useCallback(() => {
    setFormData(defaultFormData);
  }, []);

  const resetPayment = useCallback(() => {
    setFormData(defaultFormData);
    setQuotes([]);
    setSelectedQuote(null);
    setTransaction(null);
    setQuoteError(null);
    setExecutionError(null);
    setCurrentStep("form");
  }, []);

  const value: PaymentContextType = {
    formData,
    setFormData,
    updateFormData,
    resetFormData,
    quotes,
    setQuotes,
    selectedQuote,
    setSelectedQuote,
    transaction,
    setTransaction,
    isLoadingQuotes,
    setIsLoadingQuotes,
    isExecuting,
    setIsExecuting,
    quoteError,
    setQuoteError,
    executionError,
    setExecutionError,
    currentStep,
    setCurrentStep,
    resetPayment,
  };

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
};

/**
 * Hook to use payment context
 */
export const usePayment = (): PaymentContextType => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error("usePayment must be used within PaymentProvider");
  }
  return context;
};
