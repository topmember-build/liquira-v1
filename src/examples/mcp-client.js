/**
 * MCP Client Example: Dynamic Fireblocks Integration
 * 
 * This file demonstrates how to invoke MCP tools from a client application.
 * Run this with Node.js or integrate into your application:
 * 
 * node src/examples/mcp-client.js
 */

const BASE_URL = process.env.MCP_SERVER || "http://localhost:3000";

/**
 * Invoke an MCP tool
 */
async function invokeTool(toolName, input) {
  console.log(`\n📡 Calling MCP tool: ${toolName}`);
  console.log(`   Input:`, input);

  const url = `${BASE_URL}/mcp/tools/${toolName}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`   ✅ Success:`, data);
    } else {
      console.log(`   ❌ Error:`, data.error);
    }

    return data;
  } catch (error) {
    console.error(`   ❌ Failed:`, error.message);
    throw error;
  }
}

/**
 * Get MCP server metadata
 */
async function getMCPMetadata() {
  console.log("\n📡 Fetching MCP server metadata...");

  const url = `${BASE_URL}/mcp`;

  try {
    const response = await fetch(url);
    const metadata = await response.json();

    console.log("   ✅ Server Status:", metadata.status);
    console.log("   📋 Available Tools:", metadata.tools);
    console.log("   🔧 Fireblocks Ready:", metadata.capabilities.fireblocks);

    return metadata;
  } catch (error) {
    console.error("   ❌ Failed to fetch metadata:", error.message);
    throw error;
  }
}

/**
 * Example Workflow: Create wallet, check balance, send transaction
 */
async function exampleWorkflow() {
  console.log("\n========================================");
  console.log("   MCP Dynamic Fireblocks Example");
  console.log("========================================");

  try {
    // Step 1: Check server metadata
    const metadata = await getMCPMetadata();

    if (!metadata.capabilities.fireblocks) {
      console.error(
        "\n❌ Fireblocks not configured. Set env vars:\n" +
        "   FIREBLOCKS_API_KEY\n" +
        "   FIREBLOCKS_API_SECRET\n"
      );
      return;
    }

    // Step 2: Create a new wallet
    const userId = `user_${Date.now()}`;
    const walletResult = await invokeTool("create_wallet", {
      userId,
      displayName: "Example Custodial Wallet",
    });

    if (!walletResult.success) {
      throw new Error(`Failed to create wallet: ${walletResult.error}`);
    }

    const wallet = walletResult.wallet;
    console.log(`\n💰 Created wallet:`);
    console.log(`   Vault ID: ${wallet.vaultAccountId}`);
    console.log(`   Address: ${wallet.address}`);

    // Step 3: Get wallet balance
    const balanceResult = await invokeTool("get_balance", {
      userId,
      assetId: "ARC_USDC",
    });

    if (balanceResult.success) {
      console.log(`\n💵 Wallet Balance:`);
      console.log(`   Amount: ${balanceResult.balance} ${balanceResult.assetId}`);
    }

    // Step 4: Send a transaction (example)
    const destinationAddress =
      "0x8c258e75c0d4b025e211f14a898e350b4d8e69ec";
    const txResult = await invokeTool("send_transaction", {
      userId,
      destinationAddress,
      amount: 100,
      toCurrency: "USDC",
      note: "Settlement via MCP",
    });

    if (txResult.success) {
      const txId = txResult.transactionId;
      console.log(`\n🔄 Transaction Created:`);
      console.log(`   TX ID: ${txId}`);

      // Step 5: Poll transaction status
      console.log(`\n⏳ Checking transaction status...`);
      const statusResult = await invokeTool("get_transaction_status", {
        transactionId: txId,
      });

      if (statusResult.success) {
        console.log(`   Status: ${statusResult.status}`);
      }
    }

    console.log("\n✅ Example workflow completed!");
  } catch (error) {
    console.error("\n❌ Workflow error:", error.message);
  }
}

/**
 * Command-line interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Run example workflow if no args
    await exampleWorkflow();
  } else if (args[0] === "metadata") {
    // Get server metadata
    await getMCPMetadata();
  } else if (args[0] === "tool" && args.length >= 2) {
    // Invoke a specific tool
    const toolName = args[1];
    const input = args[2] ? JSON.parse(args[2]) : {};
    await invokeTool(toolName, input);
  } else {
    console.log("Usage:");
    console.log("  node mcp-client.js              # Run example workflow");
    console.log(
      "  node mcp-client.js metadata     # Get server metadata"
    );
    console.log(
      '  node mcp-client.js tool <name> [input]  # Invoke a tool'
    );
  }
}

// Export for use in other modules
module.exports = {
  invokeTool,
  getMCPMetadata,
  exampleWorkflow,
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
