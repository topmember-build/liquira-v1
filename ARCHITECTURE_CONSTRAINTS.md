# LiQuira Architecture Constraints

> **CRITICAL**: This document defines the system architecture that MUST be enforced. Do NOT redesign or introduce new frameworks.

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React + TanStack Router + Wagmi)                 │
│  - Authentication flow only (Dynamic)                       │
│  - Display transaction status                               │
│  - MUST NEVER call Arc, Circle, or sign transactions        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓ (HTTP API only)
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (LiQuira Router - TanStack Start)                  │
│  - SINGLE SOURCE OF TRUTH for all operations                │
│  - Orchestrates: quote → route → execute → update state     │
│  - Owns routes: /fx/quote, /fx/execute, /tx/:id             │
│  - Calls Arc for settlement execution                       │
│  - Calls Circle for treasury health checks (non-fatal)      │
│  - Stores all state in Supabase                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
   ┌─────────────┐      ┌──────────────┐
   │ Arc Testnet │      │ Circle API   │
   │(Execution)  │      │(Treasury)    │
   └─────────────┘      └──────────────┘
        ↓
   ┌─────────────┐
   │  ERC20      │
   │  Transfer   │
   └─────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE (State Persistence)                               │
│  - Tracks all transactions                                  │
│  - Records Arc settlement results                           │
│  - Enables polling and audit trail                          │
└─────────────────────────────────────────────────────────────┘

FUTURE:
┌─────────────────┐
│  Fireblocks     │
│  (Custody)      │
│  ⚠️  Not yet    │
│  integrated     │
└─────────────────┘
```

## Core Responsibilities

### 1. Dynamic (Authentication + Embedded Wallets)

**ALLOWED:**
- Handle user login/authentication
- Provide user identity (userId)
- Provide embedded wallet IDs
- Display user account information

**FORBIDDEN:**
- ❌ Sign transactions
- ❌ Interact with Arc or Circle directly
- ❌ Store transaction state
- ❌ Make swap decisions

**Files:** 
- `src/contexts/AuthContext.tsx`
- Dynamic SDK integration via `wagmi.ts`

---

### 2. Backend (LiQuira Router)

**RESPONSIBILITIES:**
- ✓ Single source of truth for all operations
- ✓ Rate calculation and quote generation
- ✓ Transaction orchestration
- ✓ State persistence in Supabase
- ✓ Arc settlement coordination
- ✓ Non-fatal Circle health checks

**CORE ROUTES:**
- `GET /fx/quote?from=USD&to=NGN&amount=100` → Rate + fee calculation
- `POST /fx/execute` → Orchestrate settlement (quote → Arc → update)
- `GET /tx/:id` → Poll transaction status from Supabase

**CRITICAL FILES:**
- `src/routes/fx.execute.ts` - Orchestration (THE central point)
- `src/routes/fx.quote.ts` - Pure rate calculation
- `src/routes/tx.$transactionId.ts` - Status polling
- `src/server/fx-engine.server.ts` - Rate calculations
- `src/server/arc-settlement.server.ts` - Arc integration
- `src/server/transaction-service.server.ts` - Supabase persistence
- `src/server/providers/circle.ts` - Circle API (treasury only)

**BACKEND FLOW:**
```
/fx/execute POST
  1. Parse request (fromCurrency, toCurrency, amount, destinationAddress)
  2. calculate_output() → rate, fee, estimatedAmount
  3. getCircleWalletBalances() [non-fatal]
  4. create_transaction(Supabase) → PENDING
  5. simulate_arc_settlement() → Arc ERC20 transfer
  6. update_status(Supabase) → SUCCESS + arcTxHash
  7. Return 200 with transactionId for polling

/tx/:id GET
  1. get_transaction(Supabase)
  2. Return current status + details
```

**NEVER:**
- ❌ Allow frontend to bypass backend routes
- ❌ Expose private keys to frontend
- ❌ Use Circle for swap execution
- ❌ Use Dynamic for signing
- ❌ Store transaction state outside Supabase

---

### 3. Arc Testnet (Execution Layer)

**ROLE:**
- ✓ ONLY place where swaps execute on-chain
- ✓ Handles USDC ERC20 transfers
- ✓ Produces transaction hashes and confirmations
- ✓ Settlement layer

**HOW IT'S CALLED:**
- ✓ ONLY from `/fx/execute` backend route
- ✓ Backend determines destination address
- ✓ Uses `ARC_PRIVATE_KEY` for testnet signing

**NEVER:**
- ❌ Call directly from frontend
- ❌ Call from Circle-related code
- ❌ Call with wallet IDs (only blockchain addresses)
- ❌ Use for anything other than settlement

**FILES:**
- `src/server/arc-settlement.server.ts`
- `src/lib/arc-testnet.ts` - Chain definition

---

### 4. Circle (Treasury Layer ONLY)

**ALLOWED USES:**
- ✓ Read-only wallet balance checks (health monitoring)
- ✓ Understand treasury liquidity
- ✓ Non-fatal failure handling

**FORBIDDEN USES:**
- ❌ User transaction signing
- ❌ Swap execution
- ❌ Part of the critical path
- ❌ Determining swap destinations
- ❌ Confusing wallet IDs with blockchain addresses

**CRITICAL RULE:**
Circle API failures MUST NOT block Arc settlement. If Circle is unreachable, continue with swap execution anyway.

**FILES:**
- `src/server/providers/circle.ts` - API provider
- `src/routes/fx.execute.ts` - Treasury health check (lines ~60-68)
- `src/server/wallet.balance.ts` - Read-only balances

**ERROR HANDLING:**
```typescript
try {
  const balances = await getCircleWalletBalances(treasuryWalletId);
  console.log("Treasury balances:", balances);
} catch (circleError) {
  console.warn("Circle unreachable (non-fatal):", circleError);
  // CONTINUE - do not throw, do not block Arc settlement
}
```

---

### 5. Fireblocks (OPTIONAL, NOT INTEGRATED YET)

**CURRENT STATUS:**
- ⚠️ Code stub exists but NOT part of execution path
- ⚠️ Do NOT integrate into Arc flow yet

**FUTURE USE:**
- Will replace `ARC_PRIVATE_KEY` handling for production
- Backend-only signing (same isolation principle)
- Not client-side signing

**DO NOT:**
- ❌ Integrate into `/fx/execute` flow
- ❌ Use for testnet operations
- ❌ Expose keys to frontend

**FILES:**
- `src/server/providers/fireblocks.ts` - Stub (do not use yet)
- `src/server/fx-engine.server.ts` - Deprecated functions marked with ⚠️

---

## Common Violations & Fixes

### ❌ VIOLATION #1: Circle Transfer in Swap Execution

**Wrong Code:**
```typescript
// In swaps.functions.ts - executeSwap()
const transfer = await createCircleTransfer({
  amount: data.amount,
  destinationAddress: data.walletAddress,
});
```

**Why It's Wrong:**
- Circle is NOT for swaps, only treasury
- Confuses destination wallet IDs with blockchain addresses
- Results in "403 Circle errors"

**Fix:**
- Remove `createCircleTransfer` from swap execution
- Only create transaction record in Supabase
- Let `/fx/execute` handle Arc settlement

---

### ❌ VIOLATION #2: Frontend Calling Arc or Circle Directly

**Wrong Code:**
```typescript
// In React component
const transfer = await fetch('https://api.circle.com/...');
const tx = await walletClient.writeContract(...);
```

**Why It's Wrong:**
- Breaks architecture separation
- Exposes sensitive operations to client
- No single source of truth for state

**Fix:**
- ALWAYS use backend routes: `/fx/quote`, `/fx/execute`, `/tx/:id`
- Frontend only calls backend, never external APIs

---

### ❌ VIOLATION #3: Wallet ID vs Blockchain Address Confusion

**Wrong Comment:**
```typescript
walletAddress: z.string(), // IMPORTANT: must be real Circle wallet id
```

**Why It's Wrong:**
- Circle wallet IDs ≠ blockchain addresses
- Causes invalid destination errors
- Confuses layers

**Fix:**
```typescript
destinationAddress: z.string() // Blockchain address (0x...)
```

---

### ❌ VIOLATION #4: Dynamic Signing Transactions

**Wrong Code:**
```typescript
// Dynamic is ONLY for auth, NOT for signing swaps
const signature = await dynamic.signMessage(swapData);
```

**Why It's Wrong:**
- Dynamic is authentication provider only
- Backend should handle orchestration
- Frontend should never initiate execution

**Fix:**
- Use Dynamic for login/identity only
- All execution flows through backend routes

---

## Testing Checklist

When making changes, verify:

- [ ] Frontend only calls `/fx/quote`, `/fx/execute`, `/tx/:id`
- [ ] No frontend code imports Circle API or Arc SDK
- [ ] `/fx/execute` is the ONLY entry point for swaps
- [ ] Circle API failures don't block Arc settlement
- [ ] Destination addresses are blockchain addresses (0x...), not wallet IDs
- [ ] All transaction state flows through Supabase
- [ ] `ARC_PRIVATE_KEY` is only used in backend
- [ ] No Fireblocks in current execution flow
- [ ] Console logs identify the layer (e.g., `[FX Execute]`, `[Arc Settlement]`)

---

## Adding New Features

### ✓ Allowed
- Add new currency pairs to `USD_RATES`
- Add new routes under `/` (server routes only)
- Add new Supabase table schemas
- Add read-only Circle API calls for monitoring
- Add new Arc settlement paths for future chains

### ❌ Forbidden
- Adding Circle to the swap critical path
- Frontend API calls to external services
- New wallet providers (must be through existing auth)
- Bypassing Supabase for state storage
- Using Dynamic for transaction signing

---

## Debugging Guide

### "403 Circle Error"
**Cause:** Circle transfer being used in swap execution
**Fix:** Check `swaps.functions.ts` - remove `createCircleTransfer` call
**Solution:** Use `/fx/execute` for actual settlement

### "Invalid Destination Wallet"
**Cause:** Wallet ID passed instead of blockchain address
**Fix:** Validate input schema - must be `0x` + 40 hex chars
**Location:** Check what's being passed to `simulate_arc_settlement`

### "Circle Balance Check Failed"
**Expected:** This is non-fatal
**Location:** `src/routes/fx.execute.ts` lines ~60-68
**Action:** Should log warning but continue with Arc settlement

### "Transaction Never Completes"
**Check:**
1. Is `/tx/:id` route accessible?
2. Is Supabase `fx_transactions` table created?
3. Is `update_status` being called in `/fx/execute`?

---

## References

**Key Files:**
- Architecture definition: This file
- Main execution: `src/routes/fx.execute.ts`
- Transaction service: `src/server/transaction-service.server.ts`
- Arc integration: `src/server/arc-settlement.server.ts`
- Circle provider: `src/server/providers/circle.ts`

**Environment Variables:**
```env
# Arc (Execution)
ARC_PRIVATE_KEY=0x...        # Testnet signing key

# Circle (Treasury only)
CIRCLE_API_KEY=...           # Treasury health checks
CIRCLE_WALLET_ID=...         # Treasury wallet
CIRCLE_DESTINATION_ADDRESS=... # Treasury address

# Backend state
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

**Last Updated:** May 8, 2026  
**Status:** Architecture Stabilization Complete  
**Enforcement:** Mandatory - Do not violate without explicit discussion
