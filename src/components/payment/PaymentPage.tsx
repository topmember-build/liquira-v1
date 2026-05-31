import { useEffect, useState } from "react";
import { Loader2, Send, Info, ShieldCheck, RefreshCcw, ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { usePermitSignature } from "@/hooks/usePermitSignature";
import { usePayment } from "@/contexts/PaymentContext";
import {
  useQuote,
  useExecutePayment,
  useTransaction,
  TransactionStatus as TransactionStatusType,
  ExecutePaymentRequest,
} from "@/hooks/useBackendAPI";
import { arcTestnet, FAUCETS } from "@/lib/arc-testnet";
import { HAS_WALLETCONNECT } from "@/lib/wagmi";
import { TransactionStatus } from "@/components/payment/TransactionStatus";
import TokenIcon from "@/lib/token-icons";
import { Button } from "@/components/ui/button";
import { validateWalletAddress } from "@/lib/validation";
import { getTokenBySymbol } from "@/lib/tokens";

const PAYMENT_TOKENS = ["USDC", "EURC", "cirBTC"];

export const PaymentPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const { primaryWallet: dynamicWallet } = useDynamicContext();
  const { user } = useAuth();
  const wallet = useWallet();
  const { connect, refreshBalances } = wallet;
  const payment = usePayment();
  const navigate = useNavigate();
  const hasInjectedProvider = typeof window !== "undefined" && typeof (window as any).ethereum !== "undefined";

  // Use Dynamic wallet address if no wagmi wallet is connected
  const userAddress = connectedAddress || dynamicWallet?.address;
  const isWalletConnected = isConnected || !!dynamicWallet?.address;
  const isDynamicWallet = !isConnected && !!dynamicWallet?.address;

  const { quotes, loading: quoting, error: quoteError, fetchQuotes } = useQuote();
  const { loading: executing, error: executeError, executePayment } = useExecutePayment();
  const { transaction: fetchedTransaction, pollTransaction } = useTransaction();
  const {
    requestPermitSignature,
    loading: permitLoading,
    error: permitError,
  } = usePermitSignature();

  const [fromCurrency, setFromCurrency] = useState(payment.formData.sourceToken || "USDC");
  const [amountStr, setAmountStr] = useState(payment.formData.amount || "");
  const [recipientAddress, setRecipientAddress] = useState(payment.formData.recipientAddress || "");
  const [localError, setLocalError] = useState<string | null>(null);
  const [walletNote, setWalletNote] = useState<string | null>(null);

  const toCurrency = fromCurrency;

  const amount = Number(amountStr) || 0;
  const selectedQuote = quotes.length > 0 ? quotes[0] : null;
  const receiptTransaction = payment.transaction || fetchedTransaction;
  const quoteStatus = quoting
    ? "quoting…"
    : quoteError
      ? "quote unavailable"
      : selectedQuote
        ? "live quote"
        : "no quote";

  useEffect(() => {
    payment.updateFormData({
      sourceChain: "arc-testnet",
      destinationChain: "arc-testnet",
      sourceToken: fromCurrency,
      destinationToken: toCurrency,
      amount: amountStr,
      recipientAddress,
    });
  }, [fromCurrency, toCurrency, amountStr, recipientAddress]);

  useEffect(() => {
    if (!amount || amount <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      fetchQuotes({
        sourceChain: "arc-testnet",
        destinationChain: "arc-testnet",
        sourceToken: fromCurrency,
        destinationToken: toCurrency,
        amount: amountStr,
        userAddress: userAddress ?? "",
        paymentMode: true,
        strategy: "lowest-fee",
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [amountStr, fromCurrency, toCurrency, userAddress]);

  const handleExecute = async () => {
    setLocalError(null);
    setWalletNote(null);

    if (!isWalletConnected) {
      await connect?.(
        hasInjectedProvider ? "injected" : HAS_WALLETCONNECT ? "walletconnect" : "injected",
      );
      return;
    }

    if (!amount || amount <= 0) {
      setLocalError("Enter a valid amount");
      return;
    }

    const recipient = recipientAddress.trim();
    const recipientValidation = validateWalletAddress(recipient);
    if (!recipient || !recipientValidation.valid) {
      setLocalError("Enter a valid recipient address");
      return;
    }

    if (!selectedQuote) {
      setLocalError("Quote not available yet");
      return;
    }

    const treasuryAddress =
      import.meta.env.VITE_ARC_TREASURY_ADDRESS || import.meta.env.VITE_TREASURY_ADDRESS;

    if (!treasuryAddress) {
      setLocalError("Arc treasury configuration error. Please contact support.");
      return;
    }

    const tokenInfo = getTokenBySymbol(fromCurrency, "arc-testnet");
    if (!tokenInfo) {
      setLocalError(`Token ${fromCurrency} not supported for payments.`);
      return;
    }

    let permitPayload: ExecutePaymentRequest["permit"] | undefined;

    try {
      const amountUnits = BigInt(Math.floor(amount * 10 ** tokenInfo.decimals));
      setWalletNote("Requesting wallet approval; Arc treasury will sponsor gas for this payment...");

      const permitResult = await requestPermitSignature({
        owner: userAddress as `0x${string}`,
        spender: treasuryAddress as `0x${string}`,
        token: tokenInfo.address as `0x${string}`,
        amount: amountUnits,
      });

      if (!permitResult) {
        const errorMsg = permitError?.message || "Wallet signature declined or wallet not connected";
        setLocalError(
          errorMsg.includes("not connected")
            ? "Wallet disconnected. Please reconnect your wallet and try again."
            : `Wallet approval failed: ${errorMsg}. Please try again.`,
        );
        payment.setIsExecuting(false);
        return;
      }

      permitPayload = {
        ...permitResult.permitData,
        signature: permitResult.signature,
      };
      setWalletNote("✓ Wallet approved. Arc treasury will now sponsor gas fees for this payment.");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setLocalError(
        errorMsg.includes("denied")
          ? "You declined the wallet signature request. Payment was not sent."
          : `Wallet signature request failed: ${errorMsg}. Please try again.`,
      );
      console.error("[PaymentPage] Permit signature error:", err);
      payment.setIsExecuting(false);
      return;
    }

    payment.setIsExecuting(true);
    payment.setQuoteError(null);
    payment.setExecutionError(null);
    payment.setSelectedQuote(selectedQuote);
    payment.setCurrentStep("executing");

    const result = await executePayment({
      userId: user?.id,
      sourceWalletAddress: connectedAddress || undefined,
      recipientWalletAddress: recipient,
      fromCurrency,
      toCurrency,
      amount,
      paymentMode: true,
      strategy: "lowest-fee",
      permit: permitPayload,
    });

    if (!result || !result.transactionId) {
      payment.setExecutionError(executeError?.message ?? "Payment execution failed");
      payment.setCurrentStep("confirm");
      payment.setIsExecuting(false);
      return;
    }

    await refreshBalances?.();

    const txId = result.transactionId;
    const transaction: TransactionStatusType = {
      id: txId,
      status:
        result.status === "confirmed"
          ? "confirmed"
          : result.status === "broadcasting"
            ? "pending"
            : (result.status as TransactionStatusType["status"]),
      sourceChain: "arc-testnet",
      destinationChain: "arc-testnet",
      sourceToken: fromCurrency,
      destinationToken: toCurrency,
      sourceAmount: amountStr,
      destinationAmount: selectedQuote.estimatedOutput,
      estimatedOutput: selectedQuote.estimatedOutput,
      provider: selectedQuote.providerId,
      txHash: result.txHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    payment.setTransaction(transaction);

    const terminalStatuses = ["success", "completed", "confirmed", "failed"];
    if (terminalStatuses.includes(transaction.status)) {
      payment.setCurrentStep("complete");
      payment.setIsExecuting(false);
      return;
    }

    const completed = await pollTransaction(txId, 2000, pollTimeout);
    if (completed) {
      payment.setTransaction(completed);
      payment.setCurrentStep("complete");
    }

    payment.setIsExecuting(false);
  };

  const pollTimeout = 600000;

  const formatRate = () => {
    if (!selectedQuote || amount <= 0) return "—";
    const output = Number(selectedQuote.estimatedOutput);
    if (!output || !amount) return "—";
    return (output / amount).toFixed(6);
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Payment</p>
            <h1 className="mt-3 text-[clamp(2.5rem,4vw,4rem)] font-medium tracking-[-0.03em]">
              Liquira payment interface
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Send USDC, EURC, or cirBTC on Arc testnet with Arc treasury gas sponsorship and recipient payment
              settlement.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate({ to: "/" })}
            className="inline-flex items-center gap-2 whitespace-nowrap"
          >
            <ArrowLeft size={16} /> Back
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,0.95fr]">
          <div className="border border-border bg-surface-1 p-6">
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>PAYMENT</span>
                <span>·</span>
                <span>{isWalletConnected ? `WALLET-CONNECTED (${isDynamicWallet ? "Dynamic" : "Wagmi"})` : "CONNECT WALLET"}</span>
              </div>
              <span className="text-primary">wallet-only</span>
            </div>

            <div className="mt-5 border border-border bg-background p-4">
              <div className="flex items-center justify-between text-mono-label">
                <span>YOU PAY</span>
                <span>{fromCurrency}</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full bg-transparent font-mono text-4xl text-foreground outline-none tabular-nums"
                />
                <CurrencySelect
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  options={PAYMENT_TOKENS}
                />
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span>
                  1 {fromCurrency} = {formatRate()} {toCurrency}
                </span>
                <div className="flex gap-2">
                  {["25%", "50%", "MAX"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (label === "MAX") {
                          const maxBalance =
                            fromCurrency === "USDC"
                              ? wallet.balances.USDC
                              : fromCurrency === "EURC"
                                ? wallet.balances.EURC
                                : wallet.balances.cirBTC ?? 0;
                          setAmountStr(maxBalance > 0 ? maxBalance.toFixed(4) : "");
                        } else if (amount > 0) {
                          const value =
                            label === "25%"
                              ? Math.max(1, Math.floor(amount * 0.25))
                              : Math.max(1, Math.floor(amount * 0.5));
                          setAmountStr(String(value));
                        }
                      }}
                      className="border border-border px-2 py-0.5 text-[11px] hover:bg-surface-2"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 border border-border bg-surface-1 p-4">
              <div className="flex items-center justify-between text-mono-label">
                <span>RECIPIENT ADDRESS</span>
                <span className="text-primary">required</span>
              </div>
              <div className="mt-3">
                <input
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span>Enter the wallet address to send payment to</span>
                {!recipientAddress ? null : validateWalletAddress(recipientAddress) ? (
                  <span className="text-primary">valid</span>
                ) : (
                  <span className="text-destructive">invalid</span>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-4">
                <div>
                <p className="text-[10px] uppercase tracking-[0.28em]">Connected wallet</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-foreground break-all">
                    {isConnected ? connectedAddress : "Not connected"}
                  </p>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground">
                      Arc Testnet
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void connect?.(
                        hasInjectedProvider ? "injected" : HAS_WALLETCONNECT ? "walletconnect" : "injected",
                      )
                    }
                  >
                    <ShieldCheck className="w-4 h-4" /> {isConnected ? "Reconnect" : "Connect"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void refreshBalances?.()}
                  >
                    <RefreshCcw className="w-4 h-4" /> Refresh
                  </Button>
                </div>
              </div>
              {isConnected && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="rounded-2xl border border-border bg-background p-3">
                    <p className="uppercase tracking-[0.24em] text-muted-foreground">Native</p>
                    <p className="mt-2 text-sm text-foreground">{wallet.nativeBalance ?? "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-3">
                    <p className="uppercase tracking-[0.24em] text-muted-foreground">USDC</p>
                    <p className="mt-2 text-sm text-foreground">
                      <span className="inline-flex items-center gap-2">
                        <TokenIcon symbol="USDC" size={18} />
                        <span className="font-mono">{(wallet.balances.USDC ?? 0).toFixed(4)}</span>
                      </span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-3">
                    <p className="uppercase tracking-[0.24em] text-muted-foreground">EURC</p>
                    <p className="mt-2 text-sm text-foreground">
                      <span className="inline-flex items-center gap-2">
                        <TokenIcon symbol="EURC" size={18} />
                        <span className="font-mono">{(wallet.balances.EURC ?? 0).toFixed(4)}</span>
                      </span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-3">
                    <p className="uppercase tracking-[0.24em] text-muted-foreground">cirBTC</p>
                    <p className="mt-2 text-sm text-foreground">
                      <span className="inline-flex items-center gap-2">
                        <TokenIcon symbol="cirBTC" size={18} />
                        <span className="font-mono">{(wallet.balances.cirBTC ?? 0).toFixed(8)}</span>
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {isConnected && (
                <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Need testnet USDC?</p>
                      <p className="text-sm text-muted-foreground">
                        Fund your Arc testnet wallet using the official Circle developer faucet.
                      </p>
                    </div>
                    <a
                      href={FAUCETS.find((item) => item.label.includes("Circle Faucet"))?.url ?? "https://faucet.circle.com/"}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
                    >
                      Open Circle faucet
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="my-4 rounded-2xl border border-border bg-surface-2 p-4 text-[12px] text-muted-foreground">
              Selected token will be transferred directly to the recipient using the Arc treasury gas sponsor.
            </div>

            {localError && (
              <div className="mt-4 rounded-lg border border-destructive bg-red-50 p-4 text-sm text-red-900">
                {localError}
              </div>
            )}
            {executeError && (
              <div className="mt-4 rounded-lg border border-destructive bg-red-50 p-4 text-sm text-red-900">
                {executeError.message || "Payment execution failed"}
              </div>
            )}
            {walletNote && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                {walletNote}
                {permitLoading ? " Waiting for wallet confirmation..." : ""}
              </div>
            )}
            {permitError && (
              <div className="mt-4 rounded-lg border border-warning/20 bg-warning/5 p-4 text-sm text-foreground">
                Wallet confirmation error: {permitError.message}
              </div>
            )}

            <Button
              onClick={handleExecute}
              disabled={
                executing ||
                !amount ||
                !recipientAddress ||
                !validateWalletAddress(recipientAddress)
              }
              className="mt-5 flex w-full items-center justify-center gap-2 bg-primary py-3 font-mono text-sm font-semibold tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {executing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> EXECUTING…
                </>
              ) : (
                <>
                  <Send size={14} /> ROUTE PAYMENT →
                </>
              )}
            </Button>

            <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
              <span>wallet-connected · real payments</span>
              <span className="text-primary">ready</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-border bg-surface-1 p-6">
              <div className="flex items-center justify-between text-mono-label text-muted-foreground">
                <span>RECEIPT</span>
                <span>{receiptTransaction ? "live" : "waiting"}</span>
              </div>
              <div className="mt-4 space-y-4">
                {receiptTransaction ? (
                  <TransactionStatus
                    transaction={receiptTransaction}
                    explorerUrl={arcTestnet.blockExplorers?.default?.url}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 text-primary">
                      <Info size={16} />
                      <span>Receipt preview appears here once payment is executed.</span>
                    </div>
                    <p className="mt-3 text-[13px] leading-6">
                      Payments settle through the same route engine used on the site. After
                      execution, the receipt panel shows status, route, and transaction details.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {receiptTransaction && (
              <div className="border border-border bg-background p-4 font-mono text-[11px] text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>TX ID</span>
                  <span>{receiptTransaction.id}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      From
                    </p>
                    <p className="mt-1 text-sm text-foreground">{receiptTransaction.sourceToken}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      To
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {receiptTransaction.destinationToken}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function CurrencySelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="border border-border bg-surface-2 px-3 py-2 font-mono text-sm outline-none focus:border-primary"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
