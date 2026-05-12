/**
 * Recipient address input component with validation and copy/paste support
 */

import { useState, useRef, memo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check, AlertCircle } from "lucide-react";
import { validateWalletAddress, formatAddress } from "@/lib/validation";

export interface RecipientAddressInputProps {
  value: string;
  onChange: (address: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  walletAddress?: string;
}

export const RecipientAddressInput = memo(({
  value,
  onChange,
  label = "Recipient Address",
  placeholder = "0x...",
  disabled = false,
  error,
  walletAddress,
}: RecipientAddressInputProps) => {
  const [copied, setCopied] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setShowValidation(true);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text.trim());
      setShowValidation(true);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUseMyAddress = () => {
    if (walletAddress) {
      onChange(walletAddress);
      setShowValidation(true);
    }
  };

  const validation = value ? validateWalletAddress(value) : null;
  const isValid = validation?.valid;
  const validationError = validation ? !validation.valid : false;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {walletAddress && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700 hover:bg-transparent font-medium"
            onClick={handleUseMyAddress}
          >
            Use My Address
          </Button>
        )}
      </div>

      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-24 ${
            showValidation && validationError ? "border-red-500 focus-visible:ring-red-500" : ""
          } ${showValidation && isValid ? "border-green-500 focus-visible:ring-green-500" : ""}`}
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {showValidation && value && (
            <>
              {isValid ? (
                <div className="text-green-500">
                  <Check className="w-4 h-4" />
                </div>
              ) : (
                <div className="text-red-500">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
            </>
          )}

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={copied ? undefined : handleCopy}
              className="h-auto p-1 hover:bg-gray-100"
              title={copied ? "Copied!" : "Copy"}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePaste}
            className="h-auto p-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            Paste
          </Button>
        </div>
      </div>

      {showValidation && value && (
        <>
          {validationError && error && (
            <p className="text-sm text-red-500 mt-1">{error}</p>
          )}
          {isValid && (
            <p className="text-sm text-green-600 mt-1">Valid address • {formatAddress(value, 6)}</p>
          )}
        </>
      )}
    </div>
  );
});
