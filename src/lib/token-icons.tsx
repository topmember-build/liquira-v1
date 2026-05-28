import React from "react";
import UsdcLogo from "@/components/icons/UsdcLogo";
import EurcLogo from "@/components/icons/EurcLogo";
import CirBTCLogo from "@/components/icons/CirBTCLogo";
import { getTokenBySymbol } from "./tokens";

const TokenIcon = ({
  symbol,
  size = 18,
  className = "",
}: {
  symbol: string;
  size?: number;
  className?: string;
}) => {
  const s = symbol.toUpperCase();
  if (s === "USDC") return <UsdcLogo size={size} className={className} />;
  if (s === "EURC") return <EurcLogo size={size} className={className} />;
  if (s.toLowerCase() === "cirbtc") return <CirBTCLogo size={size} className={className} />;

  const token = getTokenBySymbol(symbol);
  if (token && token.icon) {
    return <img src={token.icon} alt={token.symbol} width={size} height={size} className={className} />;
  }

  return <div style={{ width: size, height: size }} className={className} />;
};

export default TokenIcon;
