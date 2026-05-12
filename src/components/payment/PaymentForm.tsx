/**
 * Complete payment form component
 */

import { useState, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader } from "lucide-react";
import { ChainSelector } from "./ChainSelector";
import { TokenSelector } from "./TokenSelector";
import { AmountInput } from "./AmountInput";
import { RecipientAddressInput } from "./RecipientAddressInput";
import { validatePaymentForm } from "@/lib/validation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PaymentFormData {
  sourceChain: string;
  destinationChain: string;
  sourceToken: string;
  destinationToken: string;
  amount: string;
  recipientAddress: string;
  strategy: "lowest-fee" | "fastest" | "lowest-slippage";
}

export interface PaymentFormProps {
  data: PaymentFormData;
  onChange: (data: PaymentFormData) => void;
  onSubmit: (data: PaymentFormData) => void;
  walletAddress?: string;
  walletBalance?: string;
  isLoading?: boolean;
  error?: string;
  isConnected?: boolean;
  connectWallet?: () => void;
}

export const PaymentForm = memo(({
  data,
  onChange,
  onSubmit,
  walletAddress,
  walletBalance,
  isLoading = false,
  error,
  isConnected = false,
  connectWallet,
}: PaymentFormProps) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validation = useMemo(() => validatePaymentForm(data), [data]);

  const handleFieldChange = (field: keyof PaymentFormData, value: string) => {
    onChange({ ...data, [field]: value });
    setTouched({ ...touched, [field]: true });
  };

  const handleFieldBlur = (field: keyof PaymentFormData) => {
    setTouched({ ...touched, [field]: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      sourceChain: true,
      destinationChain: true,
      sourceToken: true,
      destinationToken: true,
      amount: true,
      recipientAddress: true,
    });

    if (!validation.valid) {
      return;
    }

    if (!isConnected) {
      connectWallet?.();
      return;
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 bg-white">
        {/* Wallet Connection Alert */}
        {!isConnected && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Wallet Not Connected</p>
              <p className="text-sm text-blue-700 mt-1">
                Please connect your wallet to send a payment
              </p>
            </div>
          </div>
        )}

        {/* Connected Wallet Info */}
        {isConnected && walletAddress && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center text-sm">
            <div>
              <p className="text-green-900 font-semibold">Wallet Connected</p>
              <p className="text-green-700 font-mono text-xs">{walletAddress}</p>
            </div>
            {walletBalance && <p className="text-green-900 font-semibold">{walletBalance}</p>}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Chain Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <ChainSelector
            value={data.sourceChain}
            onChange={(val) => handleFieldChange("sourceChain", val)}
            label="From Chain"
            disabled={isLoading}
            excludeChain={data.destinationChain}
          />
          <ChainSelector
            value={data.destinationChain}
            onChange={(val) => handleFieldChange("destinationChain", val)}
            label="To Chain"
            disabled={isLoading}
            excludeChain={data.sourceChain}
          />
        </div>

        {/* Token Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <TokenSelector
            value={data.sourceToken}
            onChange={(val) => handleFieldChange("sourceToken", val)}
            chainId={data.sourceChain}
            label="From Token"
            disabled={isLoading || !data.sourceChain}
          />
          <TokenSelector
            value={data.destinationToken}
            onChange={(val) => handleFieldChange("destinationToken", val)}
            chainId={data.destinationChain}
            label="To Token"
            disabled={isLoading || !data.destinationChain}
          />
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <AmountInput
            value={data.amount}
            onChange={(val) => handleFieldChange("amount", val)}
            maxAmount={walletBalance}
            disabled={isLoading}
            error={touched.amount ? validation.errors.amount : undefined}
            showMaxButton={isConnected && walletBalance !== undefined}
          />
        </div>

        {/* Recipient Address */}
        <div className="mb-6">
          <RecipientAddressInput
            value={data.recipientAddress}
            onChange={(val) => handleFieldChange("recipientAddress", val)}
            walletAddress={walletAddress}
            disabled={isLoading}
            error={touched.recipientAddress ? validation.errors.recipientAddress : undefined}
          />
        </div>

        {/* Strategy Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Optimization</label>
          <Select value={data.strategy} onValueChange={(val: any) => handleFieldChange("strategy", val)}>
            <SelectTrigger disabled={isLoading}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lowest-fee">
                <span>💰 Lowest Fee</span>
              </SelectItem>
              <SelectItem value="fastest">
                <span>⚡ Fastest</span>
              </SelectItem>
              <SelectItem value="lowest-slippage">
                <span>🎯 Lowest Slippage</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-2">
            {data.strategy === "lowest-fee"
              ? "Minimize transaction costs"
              : data.strategy === "fastest"
                ? "Minimize transaction time"
                : "Minimize price impact"}
          </p>
        </div>

        {/* Validation Summary */}
        {touched.amount &&
          touched.sourceChain &&
          touched.destinationChain &&
          touched.sourceToken &&
          touched.destinationToken &&
          touched.recipientAddress &&
          !validation.valid && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-900 mb-2">Please fix the following:</p>
              <ul className="text-sm text-red-700 space-y-1">
                {Object.entries(validation.errors).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading || !isConnected || !validation.valid}
          className="w-full h-12 text-base font-semibold"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Getting Quotes...
            </>
          ) : !isConnected ? (
            "Connect Wallet to Continue"
          ) : (
            "Get Quote"
          )}
        </Button>
      </Card>

      {/* Form Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-xs text-blue-900">
          💡 <strong>Tip:</strong> LiQuira routes your payment through the best available liquidity
          sources. Transaction times vary by route and network conditions.
        </p>
      </Card>
    </form>
  );
});
