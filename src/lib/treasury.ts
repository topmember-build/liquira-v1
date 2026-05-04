/**
 * User-configurable Arc Testnet destination (treasury) address.
 * Falls back to the default in arc-testnet.ts.
 */
import { TREASURY_ADDRESS as DEFAULT_TREASURY } from "./arc-testnet";

const STORAGE_KEY = "liquira:treasury-address";

export function isAddress(v: string): v is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

export function getTreasuryAddress(): `0x${string}` {
  if (typeof window === "undefined") return DEFAULT_TREASURY;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v && isAddress(v) ? (v as `0x${string}`) : DEFAULT_TREASURY;
}

export function setTreasuryAddress(v: string): boolean {
  if (typeof window === "undefined") return false;
  if (!isAddress(v)) return false;
  window.localStorage.setItem(STORAGE_KEY, v);
  return true;
}

export function resetTreasuryAddress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export const DEFAULT_TREASURY_ADDRESS = DEFAULT_TREASURY;
