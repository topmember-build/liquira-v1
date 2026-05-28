/**
 * Token selector component
 */

import { useState, useMemo, memo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TOKENS, getTokensForChain, type Token } from "@/lib/tokens";

export interface TokenSelectorProps {
  value: string;
  onChange: (tokenAddress: string) => void;
  chainId?: string;
  label?: string;
  disabled?: boolean;
}

export const TokenSelector = memo(({
  value,
  onChange,
  chainId,
  label = "Select Token",
  disabled = false,
}: TokenSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Get tokens for the selected chain, fallback to all unique tokens
  const availableTokens = useMemo(() => {
    const tokens = chainId ? getTokensForChain(chainId) : TOKENS;
    const unique = Array.from(
      new Map(tokens.map((t) => [t.address.toLowerCase(), t])).values()
    );

    if (!search) return unique;

    return unique.filter(
      (t) =>
        t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.address.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, chainId]);

  const selectedToken = availableTokens.find(
    (t) => t.address.toLowerCase() === value.toLowerCase()
  );

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="w-full justify-between text-left font-normal"
          >
            <span className="flex items-center gap-2">
              {selectedToken ? (
                <>
                  {selectedToken.icon && (
                    <img src={selectedToken.icon} alt={selectedToken.symbol} className="w-5 h-5" />
                  )}
                  <span>{selectedToken.symbol}</span>
                  <span className="text-xs text-gray-500">
                    {selectedToken.address.slice(0, 6)}...{selectedToken.address.slice(-4)}
                  </span>
                </>
              ) : (
                "Select token..."
              )}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search token..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 border-0 focus-visible:ring-0 px-2"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {availableTokens.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-gray-500">No tokens found</div>
            ) : (
              availableTokens.map((token) => (
                <DropdownMenuItem
                  key={token.address}
                  onClick={() => {
                    onChange(token.address);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer"
                >
                  <span className="flex items-center gap-2 w-full">
                    {token.icon && (
                      <img src={token.icon} alt={token.symbol} className="w-5 h-5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-xs text-gray-500">
                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                      </div>
                    </div>
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
