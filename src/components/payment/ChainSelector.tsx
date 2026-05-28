/**
 * Chain selector component
 */

import { useState, memo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHAINS } from "@/lib/stables";

export interface ChainSelectorProps {
  value: string;
  onChange: (chainId: string) => void;
  label?: string;
  disabled?: boolean;
  excludeChain?: string;
}

export const ChainSelector = memo(({
  value,
  onChange,
  label = "Select Chain",
  disabled = false,
  excludeChain,
}: ChainSelectorProps) => {
  const [open, setOpen] = useState(false);

  const selectedChain = CHAINS.find((c) => c.id === value);
  const availableChains = excludeChain ? CHAINS.filter((c) => c.id !== excludeChain) : CHAINS;

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
              {selectedChain ? (
                <>
                  {selectedChain.icon && (
                    <img src={selectedChain.icon} alt={selectedChain.name} className="w-5 h-5" />
                  )}
                  <span>{selectedChain.name}</span>
                </>
              ) : (
                "Select chain..."
              )}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {availableChains.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-gray-500">No chains available</div>
          ) : (
            availableChains.map((chain) => (
              <DropdownMenuItem
                key={chain.id}
                onClick={() => {
                  onChange(chain.id);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {chain.icon && <img src={chain.icon} alt={chain.name} className="w-5 h-5" />}
                  <span>{chain.name}</span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
