/**
 * MCP Server: Disabled (Fireblocks removed)
 * 
 * Previously provided Fireblocks custody integration.
 * Now using Dynamic Labs embedded wallets instead.
 * 
 * Can be re-enabled in the future if Fireblocks is needed alongside Dynamic.
 * See src/server/providers/fireblocks.ts for Fireblocks implementation.
 */

// Fireblocks integration disabled - Dynamic Labs wallets used instead
// import {
//   createDynamicWallet,
//   getWalletBalance,
//   signAndSendTransaction,
//   getTransactionStatus,
//   isFireblocksConfigured,
// } from "./providers/fireblocks";
// import { create_wallet, send_transaction, get_wallet_balance } from "./fx-engine.server";

/**
 * MCP Tool: Disabled (Fireblocks removed)
 * Use Dynamic Labs embedded wallets instead
 */
// export async function mcpCreateWallet(input: {
//   userId: string;
//   displayName?: string;
// }): Promise<{
//   success: boolean;
//   wallet?: { vaultAccountId: string; address: string; name: string };
//   error?: string;
// }>

/**
 * MCP Tool: Disabled (Fireblocks removed)
 * Use Dynamic Labs embedded wallets instead
 */
// export async function mcpGetBalance(input: {
//   userId: string;
//   assetId?: string;
// }): Promise<{
//   success: boolean;
//   balance?: number;
//   assetId?: string;
//   error?: string;
// }>

/**
 * MCP Tool: Disabled (Fireblocks removed)
 * Use Dynamic Labs embedded wallets instead
 */
// export async function mcpSendTransaction(input: {
//   userId: string;
//   destinationAddress: string;
//   amount: number;
//   toCurrency?: string;
//   note?: string;
// }): Promise<{
//   success: boolean;
//   transactionId?: string;
//   status?: string;
//   error?: string;
// }>

/**
 * MCP Tool: Disabled (Fireblocks removed)
 * Use Dynamic Labs embedded wallets instead
 */
// export async function mcpGetTransactionStatus(input: {
//   transactionId: string;
// }): Promise<{
//   success: boolean;
//   status?: string;
//   error?: string;
// }>

/**
 * MCP Tool Registry - Disabled (Fireblocks removed)
 * Map of tool name → handler function
 */
export const MCP_TOOLS = {
  // Fireblocks tools disabled - use Dynamic Labs instead
} as const;

/**
 * MCP Tool Schemas - Disabled (Fireblocks removed)
 * Fireblocks tools are no longer available.
 * Use Dynamic Labs embedded wallets instead.
 */
export const MCP_TOOL_SCHEMAS = {
  // Fireblocks tools disabled
};

/**
 * MCP Resources - Disabled (Fireblocks removed)
 * Dynamic Labs embedded wallets are now used instead
 */
export const MCP_RESOURCES = {
  // Fireblocks resources disabled
} as const;

/**
 * Initialize MCP Server (Disabled - using Dynamic Labs instead)
 */
export async function initMCPServer() {
  console.log("[MCP Server] MCP Server disabled (Fireblocks removed)");
  console.log("[MCP Server] Using Dynamic Labs embedded wallets instead");
  console.log("[MCP Server] Available tools: 0");
  console.log("[MCP Server] Available resources: 0");

  return {
    tools: MCP_TOOL_SCHEMAS,
    resources: MCP_RESOURCES,
    ready: false, // MCP server not ready - using Dynamic instead
  };
}

export default {
  tools: MCP_TOOLS,
  schemas: MCP_TOOL_SCHEMAS,
  resources: MCP_RESOURCES,
  init: initMCPServer,
};
