/**
 * Validation utilities for payment form inputs
 */

import { isAddress } from "viem";

/**
 * Validate Ethereum address
 */
export const isValidEthAddress = (address: string): boolean => {
  try {
    return isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Validate wallet address with optional checksum
 */
export const validateWalletAddress = (address: string): { valid: boolean; error?: string } => {
  if (!address) {
    return { valid: false, error: "Address is required" };
  }

  if (address.length < 42) {
    return { valid: false, error: "Address is too short" };
  }

  if (!address.startsWith("0x")) {
    return { valid: false, error: "Address must start with 0x" };
  }

  if (!isValidEthAddress(address)) {
    return { valid: false, error: "Invalid Ethereum address" };
  }

  return { valid: true };
};

/**
 * Validate amount input
 */
export const validateAmount = (
  amount: string,
  decimals: number = 18
): { valid: boolean; error?: string } => {
  if (!amount) {
    return { valid: false, error: "Amount is required" };
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return { valid: false, error: "Invalid amount" };
  }

  if (numAmount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  // Check decimal places
  const decimalPlaces = amount.split(".")[1]?.length || 0;
  if (decimalPlaces > decimals) {
    return { valid: false, error: `Maximum ${decimals} decimal places allowed` };
  }

  return { valid: true };
};

/**
 * Validate payment form
 */
export const validatePaymentForm = (data: {
  sourceChain?: string;
  destinationChain?: string;
  sourceToken?: string;
  destinationToken?: string;
  amount?: string;
  recipientAddress?: string;
}): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.sourceChain) {
    errors.sourceChain = "Source chain is required";
  }

  if (!data.destinationChain) {
    errors.destinationChain = "Destination chain is required";
  }

  if (data.sourceChain === data.destinationChain) {
    errors.destinationChain = "Destination chain must be different from source chain";
  }

  if (!data.sourceToken) {
    errors.sourceToken = "Source token is required";
  }

  if (!data.destinationToken) {
    errors.destinationToken = "Destination token is required";
  }

  if (!data.amount) {
    errors.amount = "Amount is required";
  } else {
    const amountValidation = validateAmount(data.amount);
    if (!amountValidation.valid) {
      errors.amount = amountValidation.error || "Invalid amount";
    }
  }

  if (!data.recipientAddress) {
    errors.recipientAddress = "Recipient address is required";
  } else {
    const addressValidation = validateWalletAddress(data.recipientAddress);
    if (!addressValidation.valid) {
      errors.recipientAddress = addressValidation.error || "Invalid address";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Format address for display (shortened version)
 */
export const formatAddress = (address: string, chars = 4): string => {
  if (!isValidEthAddress(address)) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Format large numbers with commas
 */
export const formatNumber = (num: string | number, decimals = 2): string => {
  const number = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(number)) return "0";

  return number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/**
 * Parse large numbers from input
 */
export const parseAmount = (amount: string, decimals = 18): bigint => {
  if (!amount || isNaN(parseFloat(amount))) {
    return 0n;
  }

  const [integer, decimal] = amount.split(".");
  const paddedDecimal = (decimal || "").padEnd(decimals, "0");
  const full = integer + paddedDecimal;

  return BigInt(full);
};
