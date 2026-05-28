/**
 * ⚠️  DEVELOPMENT ONLY - Circle API Test
 * 
 * This file is for testing Circle API connectivity during development.
 * Do NOT use this for swap execution or production.
 * 
 * ARCHITECTURE NOTE:
 * This tests the Circle treasury API, which is non-critical.
 * Actual swaps use Arc testnet, not Circle.
 */
import { createCircleTransfer } from "./providers/circle";

export async function testCircleTransfer() {
  console.log(
    "[testCircleTransfer] ⚠️  DEV ONLY - Testing Circle treasury API, not swap execution"
  );
  const result = await createCircleTransfer({
    amount: 1,
    destinationAddress: "PUT_RECIPIENT_ADDRESS_HERE",
  });

  console.log("Circle test result:", result);
}

