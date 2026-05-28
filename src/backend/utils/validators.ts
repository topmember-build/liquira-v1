/**
 * Input validation schemas using Zod
 * Ensures all user inputs are validated before processing
 */

import { z } from "zod";

// ============ QUOTE REQUEST VALIDATION ============

export const QuoteRequestSchema = z.object({
  sourceChain: z.string().min(1, "Source chain is required"),
  destinationChain: z.string().min(1, "Destination chain is required"),
  sourceToken: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid source token address"),
  destinationToken: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid destination token address"),
  amount: z
    .string()
    .regex(/^\d+$/, "Amount must be a positive integer (in wei)"),
  userAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid user address"),
  strategy: z
    .enum(["lowest-fee", "fastest", "lowest-slippage"])
    .default("lowest-fee"),
});

export type QuoteRequestInput = z.infer<typeof QuoteRequestSchema>;

// ============ EXECUTE REQUEST VALIDATION ============

export const ExecuteRequestSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  quoteId: z.string().min(1, "Quote ID is required"),
  userAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid user address"),
  signature: z.string().optional(),
});

export type ExecuteRequestInput = z.infer<typeof ExecuteRequestSchema>;

// ============ WEBHOOK REQUEST VALIDATION ============

export const ArcWebhookSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  status: z.enum(["initiated", "executing", "completed", "failed"]),
  currentStep: z.number().optional(),
  totalSteps: z.number().optional(),
  finalOutput: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  txHash: z.string().optional(),
  error: z.string().optional(),
});

export type ArcWebhookInput = z.infer<typeof ArcWebhookSchema>;

// ============ VALIDATION UTILITIES ============

/**
 * Validate input against schema
 * Returns validated data or throws formatted error
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors);
    }
    throw error;
  }
}

export class ValidationError extends Error {
  constructor(
    public errors: z.ZodError["errors"],
    message: string = "Validation failed"
  ) {
    super(message);
    this.name = "ValidationError";
  }

  getFormattedErrors() {
    return this.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
  }
}

export default {
  QuoteRequestSchema,
  ExecuteRequestSchema,
  ArcWebhookSchema,
  validateInput,
};
