/**
 * Amount input component
 */

import { useState, useEffect, memo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface AmountInputProps {
  value: string;
  onChange: (amount: string) => void;
  label?: string;
  placeholder?: string;
  maxAmount?: string;
  decimals?: number;
  disabled?: boolean;
  error?: string;
  showMaxButton?: boolean;
}

export const AmountInput = memo(({
  value,
  onChange,
  label = "Amount",
  placeholder = "0.00",
  maxAmount,
  decimals = 18,
  disabled = false,
  error,
  showMaxButton = true,
}: AmountInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Only allow numbers and one decimal point
    if (inputValue === "") {
      onChange("");
      return;
    }

    if (!/^\d*\.?\d*$/.test(inputValue)) {
      return;
    }

    // Limit decimal places
    const parts = inputValue.split(".");
    if (parts[1] && parts[1].length > decimals) {
      return;
    }

    onChange(inputValue);
  };

  const handleMax = () => {
    if (maxAmount) {
      onChange(maxAmount);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {maxAmount && showMaxButton && (
          <div className="text-xs">
            <span className="text-gray-500">Available: </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 font-semibold text-blue-600 hover:text-blue-700 hover:bg-transparent"
              onClick={handleMax}
            >
              {maxAmount}
            </Button>
          </div>
        )}
      </div>

      <div className={`relative ${error ? "mb-1" : ""}`}>
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`text-lg font-semibold ${
            error ? "border-red-500 focus-visible:ring-red-500" : ""
          }`}
        />
        {isFocused && value && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
            {new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
              parseFloat(value) || 0
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
});
