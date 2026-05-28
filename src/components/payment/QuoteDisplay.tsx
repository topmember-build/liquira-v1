/**
 * Quote display component showing fetched quotes with ranking
 */

import { memo } from "react";
import { NormalizedQuote } from "@/hooks/useBackendAPI";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Zap } from "lucide-react";
import { formatNumber, formatAddress } from "@/lib/validation";

export interface QuoteDisplayProps {
  quotes: NormalizedQuote[];
  selectedQuoteId?: string;
  onSelectQuote: (quote: NormalizedQuote) => void;
  sourceToken?: string;
  destinationToken?: string;
  strategy?: string;
  isLoading?: boolean;
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
};

export const QuoteDisplay = memo(({
  quotes,
  selectedQuoteId,
  onSelectQuote,
  sourceToken,
  destinationToken,
  strategy,
  isLoading,
}: QuoteDisplayProps) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">No quotes available. Please try different parameters.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {quotes.map((quote, index) => {
        const isSelected = selectedQuoteId === quote.quoteId;
        const isRecommended = quote.recommended || (index === 0 && strategy === "lowest-fee");

        return (
          <Card
            key={quote.quoteId}
            className={`p-4 cursor-pointer transition-all ${
              isSelected
                ? "border-2 border-blue-500 bg-blue-50"
                : "border border-gray-200 hover:border-gray-300 hover:shadow-md"
            }`}
            onClick={() => onSelectQuote(quote)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isRecommended && (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      Recommended
                    </Badge>
                  )}
                  {quote.rank && (
                    <span className="text-sm font-semibold text-gray-600">#{quote.rank}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">{quote.providerId}</span>
              </div>
              {isSelected && <Check className="w-5 h-5 text-blue-600" />}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              {/* Received Amount */}
              <div>
                <p className="text-xs text-gray-500 mb-1">You Receive</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatNumber(quote.estimatedOutput, 6)}
                </p>
                {destinationToken && (
                  <p className="text-xs text-gray-500">{destinationToken}</p>
                )}
              </div>

              {/* Time */}
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Estimated Time
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatTime(quote.estimatedTime)}
                </p>
              </div>
            </div>

            {/* Fees Breakdown */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Gas Fees:</span>
                <span className="font-semibold text-gray-900">
                  ${formatNumber(quote.fees.gas, 2)}
                </span>
              </div>
              {parseFloat(quote.fees.bridge) > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Bridge Fees:</span>
                  <span className="font-semibold text-gray-900">
                    ${formatNumber(quote.fees.bridge, 2)}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-xs font-semibold">
                <span className="text-gray-700">Total Fees:</span>
                <span className="text-gray-900">${formatNumber(quote.fees.total, 2)}</span>
              </div>
            </div>

            {/* Route Steps */}
            {quote.route && quote.route.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Route</p>
                <div className="flex items-center gap-2 text-xs">
                  {quote.route.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-700 capitalize">
                        {step.type}
                      </span>
                      {idx < quote.route.length - 1 && (
                        <span className="text-gray-400 font-bold">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score */}
            {quote.score !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-gray-600">
                  <Zap className="w-3 h-3" />
                  Score
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${Math.min(quote.score * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
});
