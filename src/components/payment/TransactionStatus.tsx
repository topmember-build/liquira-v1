/**
 * Transaction status display component
 */

import { TransactionStatus as TransactionStatusType } from "@/hooks/useBackendAPI";
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
import TokenIcon from "@/lib/token-icons";

export interface TransactionStatusProps {
  transaction: TransactionStatusType;
  explorerUrl?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
    case "success":
    case "confirmed":
      return <CheckCircle className="w-5 h-5 text-primary" />;
    case "failed":
      return <XCircle className="w-5 h-5 text-destructive" />;
    case "bridging":
      return <Loader className="w-5 h-5 text-primary animate-spin" />;
    case "pending":
      return <Clock className="w-5 h-5 text-yellow-400" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
    case "success":
    case "confirmed":
      return "bg-surface-1 border-primary/40";
    case "failed":
      return "bg-surface-1 border-destructive/40";
    case "bridging":
      return "bg-surface-1 border-primary/40";
    case "pending":
      return "bg-surface-1 border-yellow-400/40";
    default:
      return "bg-surface-1 border-border";
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "completed":
    case "success":
    case "confirmed":
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
    <div className={`p-6 border border-border bg-surface-1 rounded-lg ${getStatusColor(transaction.status)}`}>
      {/* Header with Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {getStatusIcon(transaction.status)}
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Transaction Status</p>
            <Badge className={`${getStatusBadgeColor(transaction.status)} text-white mt-2`}>
              {formatStatusLabel(transaction.status)}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{new Date(transaction.createdAt).toLocaleString()}</p>
      </div>

      {/* Error Message */}
      {transaction.status === "failed" && transaction.errorMessage && (
        <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-3 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Transaction Failed</p>
            <p className="text-sm text-destructive mt-1">{transaction.errorMessage}</p>
          </div>
        </div>
      )}

      {/* Transaction Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* From */}
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">From</p>
          <p className="text-sm font-semibold text-foreground">{transaction.sourceChain}</p>
          <div className="flex items-center gap-2">
            <TokenIcon symbol={transaction.sourceToken} size={16} />
            <p className="text-xs text-muted-foreground">{transaction.sourceToken}</p>
          </div>
          <p className="text-sm font-mono text-primary">{formatNumber(transaction.sourceAmount, 6)}</p>
        </div>

        {/* To */}
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">To</p>
          <p className="text-sm font-semibold text-foreground">{transaction.destinationChain}</p>
          <div className="flex items-center gap-2">
            <TokenIcon symbol={transaction.destinationToken} size={16} />
            <p className="text-xs text-muted-foreground">{transaction.destinationToken}</p>
          </div>
          <p className="text-sm font-mono text-primary">
            {transaction.destinationAmount
              ? formatNumber(transaction.destinationAmount, 6)
              : "Pending"}
          </p>
        </div>
      </div>

      {/* Route Information */}
      <div className="bg-surface-2 rounded-lg p-4 mb-6 border border-border">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Route Information</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Provider</p>
            <p className="font-semibold text-foreground font-mono mt-1">Liquira FX</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Estimated Output</p>
            <p className="font-semibold text-foreground font-mono mt-1">{formatNumber(transaction.estimatedOutput, 6)}</p>
          </div>
        </div>
      </div>

      {/* Transaction Hash */}
      {transaction.txHash && (
        <div className="bg-surface-2 rounded-lg p-4 mb-6 border border-border">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Transaction Hash</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-surface-1 p-2 rounded overflow-x-auto font-mono text-primary">
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
              <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </Button>
            {transaction.txHash && getExplorerLink(transaction.txHash) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const explorerLink = transaction.txHash ? getExplorerLink(transaction.txHash) : null;
                  if (explorerLink) window.open(explorerLink, "_blank");
                }}
                className="h-auto p-1"
                title="View on explorer"
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
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
    </div>
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
