export const PROTOCOL_FEE_RATE = 0.0004; // 4 bps
export const GAS_FEE = 0.012;

export function calculateFees(amount: number) {
  const protocolFee = amount * PROTOCOL_FEE_RATE;

  return {
    protocolFee,
    gasFee: GAS_FEE,
    totalFee: protocolFee + GAS_FEE,
  };
}