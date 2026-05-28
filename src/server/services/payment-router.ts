import {
  build_payment_route,
  RouteEngineParams,
  RouteEngineResult,
} from "@/server/services/route-engine";
import {
  create_payment_transaction,
  log_transaction_event,
  notifyTransactionStatus,
  record_route_selection,
} from "@/server/services/transaction-journal";

export interface PaymentRouteRequest {
  userId?: string;
  sourceWalletAddress?: string;
  recipientWalletAddress: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  strategy?: "lowest-fee" | "fastest" | "lowest-slippage";
  permit?: Record<string, unknown>;
}

export interface PaymentRouteResult {
  transactionId: string;
  transaction: {
    id: string;
    transactionId: string;
    userId: string;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    rate: number;
    fee: number;
    status: string;
    details: Record<string, unknown>;
  };
  route: RouteEngineResult;
}

export async function route_payment(
  request: PaymentRouteRequest
): Promise<PaymentRouteResult> {
  const userId = request.userId || request.sourceWalletAddress || "treasury";
  const routeParams: RouteEngineParams = {
    transactionId: "pending",
    sourceWalletAddress: request.sourceWalletAddress,
    recipientWalletAddress: request.recipientWalletAddress,
    fromCurrency: request.fromCurrency,
    toCurrency: request.toCurrency,
    amount: request.amount,
    strategy: request.strategy,
  };

  const { rate, estimatedFees: fee, estimatedOutput: estimatedAmount } = build_payment_route({
    ...routeParams,
    transactionId: "pending",
  });

  const transaction = await create_payment_transaction({
    userId,
    walletAddress: request.sourceWalletAddress,
    recipientAddress: request.recipientWalletAddress,
    network: "arc-testnet",
    executionType: request.permit ? "permit" : "transfer",
    gasSponsored: true,
    fromCurrency: request.fromCurrency,
    toCurrency: request.toCurrency,
    fromAmount: request.amount,
    toAmount: estimatedAmount,
    rate,
    fee,
  });

  const route = build_payment_route({
    ...routeParams,
    transactionId: transaction.transactionId,
  });

  const updatedTx = await record_route_selection(transaction.transactionId, {
    providerId: route.providerId,
    routeId: route.routeId,
    arcPayload: route.arcPayload,
    estimatedOutput: route.estimatedOutput,
    estimatedFees: route.estimatedFees,
    estimatedTimeSeconds: route.estimatedTimeSeconds,
    slippagePercent: route.slippagePercent,
    sourceWalletAddress: request.sourceWalletAddress,
    recipientWalletAddress: request.recipientWalletAddress,
    permit: request.permit,
  });

  await log_transaction_event(transaction.transactionId, "route.selected", {
    providerId: route.providerId,
    routeId: route.routeId,
    recipient: request.recipientWalletAddress,
  });

  await notifyTransactionStatus(updatedTx ?? transaction, "pending");

  return {
    transactionId: transaction.transactionId,
    transaction: updatedTx ?? transaction,
    route,
  };
}
