/**
 * Main payment page component
 */

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useQuote, useExecute, useTransaction, NormalizedQuote } from "@/hooks/useBackendAPI";
import { usePayment } from "@/contexts/PaymentContext";
import { PaymentForm, PaymentFormData } from "@/components/payment/PaymentForm";
import { QuoteDisplay } from "@/components/payment/QuoteDisplay";
import { TransactionStatus } from "@/components/payment/TransactionStatus";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader } from "lucide-react";
import { useAccount } from "wagmi";

interface PaymentPageProps {
  onBack?: () => void;
}

export const PaymentPage = ({ onBack }: PaymentPageProps) => {
  const { address: connectedAddress, isConnected } = useAccount();
  const { connect, disconnect } = useWallet();
  const payment = usePayment();

  // API hooks
  const { quotes, loading: quotesLoading, error: quoteError, fetchQuotes } = useQuote();
  const { loading: executingLoading, error: executionError, execute } = useExecute();
  const {
    transaction,
    loading: txLoading,
    error: txError,
    fetchTransaction,
    pollTransaction,
  } = useTransaction();

  // Local state - use payment context data directly
  const [selectedQuote, setSelectedQuote] = useState<NormalizedQuote | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Use form data from context directly
  const formData = payment.formData;

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      await connect?.("injected");
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  };

  // Handle quote fetch
  const handleGetQuote = async (data: PaymentFormData) => {
    if (!connectedAddress) {
      handleConnectWallet();
      return;
    }

    payment.setIsLoadingQuotes(true);
    payment.setQuoteError(null);
    payment.setCurrentStep("quotes");

    try {
      const result = await fetchQuotes({
        sourceChain: data.sourceChain,
        destinationChain: data.destinationChain,
        sourceToken: data.sourceToken,
        destinationToken: data.destinationToken,
        amount: data.amount,
        userAddress: connectedAddress,
        strategy: data.strategy,
      });

      if (result && result.length > 0) {
        payment.setQuotes(result);
        // Auto-select first quote (usually best for strategy)
        const recommended = result.find((q) => q.recommended) || result[0];
        setSelectedQuote(recommended);
        payment.setSelectedQuote(recommended);
      } else {
        payment.setQuoteError("No quotes available for this route");
        payment.setCurrentStep("form");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch quotes";
      payment.setQuoteError(errorMessage);
      payment.setCurrentStep("form");
    } finally {
      payment.setIsLoadingQuotes(false);
    }
  };

  // Handle quote selection
  const handleSelectQuote = (quote: NormalizedQuote) => {
    setSelectedQuote(quote);
    payment.setSelectedQuote(quote);
    payment.setCurrentStep("confirm");
  };

  // Handle back to quotes
  const handleBackToQuotes = () => {
    payment.setCurrentStep("quotes");
  };

  // Handle back to form
  const handleBackToForm = () => {
    payment.setCurrentStep("form");
    setSelectedQuote(null);
    setTransactionId(null);
  };

  // Handle execution
  const handleExecute = async () => {
    if (!selectedQuote || !connectedAddress) {
      return;
    }

    payment.setIsExecuting(true);
    payment.setExecutionError(null);
    payment.setCurrentStep("executing");

    try {
      // In production, user would sign transaction
      const signature = "0x"; // Placeholder - would be actual signature

      const result = await execute({
        transactionId: selectedQuote.quoteId,
        quoteId: selectedQuote.quoteId,
        userAddress: connectedAddress,
        signature,
      });

      if (result) {
        setTransactionId(result.executionId);
        payment.setTransaction({
          id: result.executionId,
          status: "pending",
          sourceChain: formData.sourceChain,
          destinationChain: formData.destinationChain,
          sourceToken: formData.sourceToken,
          destinationToken: formData.destinationToken,
          sourceAmount: formData.amount,
          estimatedOutput: selectedQuote.estimatedOutput,
          provider: selectedQuote.providerId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Poll for transaction completion (max 10 minutes)
        const completed = await pollTransaction(result.executionId, 2000, 600000);
        if (completed) {
          payment.setTransaction(completed);
          payment.setCurrentStep("complete");
        }
      } else {
        payment.setExecutionError("Failed to execute transaction");
        payment.setCurrentStep("confirm");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Execution failed";
      payment.setExecutionError(errorMessage);
      payment.setCurrentStep("confirm");
    } finally {
      payment.setIsExecuting(false);
    }
  };

  const handleReset = () => {
    payment.resetPayment();
    setSelectedQuote(null);
    setTransactionId(null);
  };

  // Render different steps
  const renderContent = () => {
    switch (payment.currentStep) {
      case "form":
        return (
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <PaymentForm
              data={payment.formData}
              onChange={payment.setFormData}
              onSubmit={handleGetQuote}
              walletAddress={connectedAddress}
              isLoading={quotesLoading}
              error={payment.quoteError || undefined}
              isConnected={isConnected}
              connectWallet={handleConnectWallet}
            />
          </div>
        );

      case "quotes":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Available Routes</h2>
              <Button variant="outline" onClick={handleBackToForm}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-900">
                Select the best route for your payment. Routes are ranked by your selected optimization strategy.
              </p>
            </Card>
            <QuoteDisplay
              quotes={quotes}
              selectedQuoteId={selectedQuote?.quoteId}
              onSelectQuote={handleSelectQuote}
              strategy={payment.formData.strategy}
              isLoading={quotesLoading}
            />
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Confirm Payment</h2>
              <Button variant="outline" onClick={handleBackToQuotes}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            {selectedQuote && (
              <Card className="p-6">
                <div className="space-y-4">
                  {/* Route Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">From</p>
                      <p className="text-lg font-semibold">{payment.formData.sourceChain}</p>
                      <p className="text-sm text-gray-600">{payment.formData.amount} {payment.formData.sourceToken}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">To</p>
                      <p className="text-lg font-semibold">{payment.formData.destinationChain}</p>
                      <p className="text-sm text-gray-600">
                        {selectedQuote.estimatedOutput} {payment.formData.destinationToken}
                      </p>
                    </div>
                  </div>

                  {/* Provider & Fees */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-700">Provider</span>
                      <Badge>{selectedQuote.providerId}</Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gas Fees:</span>
                        <span className="font-semibold">${selectedQuote.fees.gas}</span>
                      </div>
                      {parseFloat(selectedQuote.fees.bridge) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bridge Fees:</span>
                          <span className="font-semibold">${selectedQuote.fees.bridge}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total Fees:</span>
                        <span>${selectedQuote.fees.total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div className="text-sm">
                    <p className="text-gray-600 mb-1">Recipient</p>
                    <p className="font-mono bg-gray-100 p-2 rounded text-xs break-all">
                      {payment.formData.recipientAddress}
                    </p>
                  </div>

                  {/* Execute Button */}
                  <Button
                    onClick={handleExecute}
                    disabled={executingLoading}
                    className="w-full h-12 text-base font-semibold"
                  >
                    {executingLoading ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      "Execute Payment"
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {payment.executionError && (
              <Card className="p-4 bg-red-50 border-red-200">
                <p className="text-sm text-red-900">
                  <strong>Error:</strong> {payment.executionError}
                </p>
              </Card>
            )}
          </div>
        );

      case "executing":
        return (
          <div className="space-y-6 text-center">
            <Loader className="w-16 h-16 animate-spin mx-auto text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Processing Your Payment</h2>
              <p className="text-gray-600">Please wait while your transaction is being processed...</p>
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6">
            {transaction && <TransactionStatus transaction={transaction} />}
            <Button onClick={handleReset} className="w-full h-12 text-base font-semibold">
              Send Another Payment
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">LiQuira Payment</h1>
          <p className="text-gray-600">Fast and secure cross-chain payments</p>
        </div>

        {/* Main Content */}
        {renderContent()}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-600">
          <p>Powered by LiQuira • Secure • Fast • Reliable</p>
        </div>
      </div>
    </div>
  );
};
