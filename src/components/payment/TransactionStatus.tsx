/**
 * Transaction status display component
 */

import { TransactionStatus as TransactionStatusType } from "@/hooks/useBackendAPI";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  Copy,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber, formatAddress } from "@/lib/validation";
import { useState } from "react";
import { memo } from "react";

export interface TransactionStatusProps {
  transaction: TransactionStatusType;
  explorerUrl?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case "failed":
      return <XCircle className="w-5 h-5 text-red-600" />;
    case "bridging":
      return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
    case "pending":
      return <Clock className="w-5 h-5 text-yellow-600" />;
    default:
      return <Clock className="w-5 h-5 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-50 border-green-200";
    case "failed":
      return "bg-red-50 border-red-200";
    case "bridging":
      return "bg-blue-50 border-blue-200";
    case "pending":
      return "bg-yellow-50 border-yellow-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-600 hover:bg-green-700";
    case "failed":
      return "bg-red-600 hover:bg-red-700";
    case "bridging":
      return "bg-blue-600 hover:bg-blue-700";
    case "pending":
      return "bg-yellow-600 hover:bg-yellow-700";
    default:
      return "bg-gray-600 hover:bg-gray-700";
  }
};

const formatStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const TransactionStatus = memo(({ transaction, explorerUrl }: TransactionStatusProps) => {
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const getExplorerLink = (txHash: string) => {
    if (explorerUrl && txHash) {
      return `${explorerUrl}/tx/${txHash}`;
    }
    return null;
  };

  return (
    <Card className={`p-6 border-2 ${getStatusColor(transaction.status)}`}>
      {/* Header with Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {getStatusIcon(transaction.status)}
          <div>
            <p className="text-sm text-gray-600">Transaction Status</p>
            <Badge className={`${getStatusBadgeColor(transaction.status)} text-white mt-1`}>
              {formatStatusLabel(transaction.status)}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleString()}</p>
      </div>

      {/* Error Message */}
      {transaction.status === "failed" && transaction.errorMessage && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Transaction Failed</p>
            <p className="text-sm text-red-700 mt-1">{transaction.errorMessage}</p>
          </div>
        </div>
      )}

      {/* Transaction Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* From */}
        <div>
          <p className="text-xs text-gray-600 mb-1">From</p>
          <p className="text-sm font-semibold text-gray-900">{transaction.sourceChain}</p>
          <p className="text-xs text-gray-500">{transaction.sourceToken}</p>
          <p className="text-sm font-mono text-blue-600">{formatNumber(transaction.sourceAmount, 6)}</p>
        </div>

        {/* To */}
        <div>
          <p className="text-xs text-gray-600 mb-1">To</p>
          <p className="text-sm font-semibold text-gray-900">{transaction.destinationChain}</p>
          <p className="text-xs text-gray-500">{transaction.destinationToken}</p>
          <p className="text-sm font-mono text-blue-600">
            {transaction.destinationAmount
              ? formatNumber(transaction.destinationAmount, 6)
              : "Pending"}
          </p>
        </div>
      </div>

      {/* Route Information */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-xs font-semibold text-gray-700 mb-3">Route Information</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-600">Provider</p>
            <p className="font-semibold text-gray-900">{transaction.provider}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Estimated Output</p>
            <p className="font-semibold text-gray-900">{formatNumber(transaction.estimatedOutput, 6)}</p>
          </div>
        </div>
      </div>

      {/* Transaction Hash */}
      {transaction.txHash && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-gray-700 mb-2">Transaction Hash</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {transaction.txHash}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleCopyHash(transaction.txHash!)}
              className="h-auto p-1"
              title={copiedHash ? "Copied!" : "Copy hash"}
            >
              <Copy className="w-4 h-4 text-gray-600 hover:text-gray-900" />
            </Button>
            {getExplorerLink(transaction.txHash) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(getExplorerLink(transaction.txHash)!, "_blank")}
                className="h-auto p-1"
                title="View on explorer"
              >
                <ExternalLink className="w-4 h-4 text-gray-600 hover:text-gray-900" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-xs text-gray-600 text-center">
        <p>
          Started: {new Date(transaction.createdAt).toLocaleTimeString()}
        </p>
        {transaction.updatedAt !== transaction.createdAt && (
          <p>Updated: {new Date(transaction.updatedAt).toLocaleTimeString()}</p>
        )}
      </div>
    </Card>
  );
});

/**
 * Transaction status mini display (compact version)
 */
export const TransactionStatusMini = ({ transaction }: { transaction: TransactionStatusType }) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
      {getStatusIcon(transaction.status)}
      <span className="text-sm font-medium">{formatStatusLabel(transaction.status)}</span>
      {transaction.txHash && (
        <span className="text-xs text-gray-500">{formatAddress(transaction.txHash, 3)}</span>
      )}
    </div>
  );
};
