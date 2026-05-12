# LiQuira Backend - Module Guide

This guide explains how each module works in the LiQuira routing engine and where future integrations fit.

---

## 1. Quote Engine (`services/quote-engine.ts`)

### Purpose
Fetches and normalizes quotes from multiple routing providers.

### How It Works

```typescript
// User requests a quote
const quotes = await quoteEngine.getQuotes({
  sourceChain: "ethereum",
  destinationChain: "polygon",
  sourceToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  destinationToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC.e
  amount: "1000000000", // 1000 USDC in wei
  userAddress: "0x1234..."
});

// Quote Engine fetches from all providers in parallel:
// ├─ LI.FI API call
// ├─ Socket API call
// └─ Relay API call

// Each provider returns different format → normalize to common format
// Returns: [
//   {
//     providerId: "lifi",
//     estimatedOutput: "999000000",
//     fees: { gasFee, bridgeFee, total },
//     estimatedTime: 300,
//     route: [...],
//     arcPayload: {...}
//   },
//   ...
// ]
```

### Key Features
- **Provider Abstraction:** Each provider has its own client (LI.FI, Socket, Relay)
- **Normalization:** All responses converted to standard format
- **Parallel Requests:** All API calls happen simultaneously for speed
- **Error Handling:** If one provider fails, continues with others
- **ARC Payload Preparation:** Each quote includes ARC execution instructions

### Adding a New Provider

1. Create aggregator file: `src/backend/aggregators/new-provider-aggregator.ts`

```typescript
async fetchNewProviderQuote(request: QuoteRequest): Promise<NormalizedQuote> {
  // Call provider API
  // Normalize to standard format
  // Build ARC payload
  // Return NormalizedQuote
}
```

2. Add to quote engine:

```typescript
if (CONFIGURATION.PROVIDERS.NEW_PROVIDER.enabled) {
  quotePromises.push(this.fetchNewProviderQuote(request));
}
```

3. Add to config: `config/environment.ts`

```typescript
NEW_PROVIDER: {
  enabled: config.ENABLE_NEW_PROVIDER,
  apiKey: config.NEW_PROVIDER_API_KEY,
  baseUrl: "https://api.provider.com",
  timeout: 30000,
}
```

---

## 2. Route Optimizer (`services/route-optimizer.ts`)

### Purpose
Scores routes based on fees, speed, and slippage. Recommends best options.

### How It Works

```typescript
// Optimizer receives raw quotes from Quote Engine
const optimizedQuotes = routeOptimizer.scoreQuotes(quotes, "lowest-fee");

// Scoring algorithm:
// score = (feeScore * 0.5) + (timeScore * 0.3) + (slippageScore * 0.2)

// Where:
// feeScore = 1 - (route_fees / max_fees) → 0-1
// timeScore = 1 - (time / max_time) → 0-1
// slippageScore = 1 - (slippage / max_slippage) → 0-1

// Returns ranked routes:
// [
//   { rank: 1, quoteId: "quote-1", score: 0.95, recommended: true, ... },
//   { rank: 2, quoteId: "quote-2", score: 0.85, recommended: false, ... },
//   ...
// ]
```

### Optimization Strategies

1. **lowest-fee** (default)
   - Weights: fees 50%, time 30%, slippage 20%
   - Best for: Large value transfers where fees matter most

2. **fastest**
   - Weights: fees 30%, time 50%, slippage 20%
   - Best for: Time-critical payments

3. **lowest-slippage**
   - Weights: fees 30%, time 30%, slippage 40%
   - Best for: Stablecoin transfers where slippage must be minimized

### Route Filtering

Routes that don't meet acceptable thresholds are filtered:

```typescript
MAX_ACCEPTABLE_SLIPPAGE = 0.01 // 1%
```

---

## 3. Swap + Bridge Orchestrator (`services/orchestrator.ts`)

### Purpose
Plans transaction execution sequence **without actually executing**. Creates ARC payload.

### Key Principle
❌ **Does NOT execute transactions**
✅ **Plans what needs to happen and formats for ARC**

### Execution Plan Structure

```typescript
{
  id: "exec-plan-123",
  steps: [
    {
      id: "step-1",
      type: "token-approval",
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      spender: "ARC_ADDRESS",
      amount: "1000000000",
      chainId: 1
    },
    {
      id: "step-2",
      type: "swap",
      from: { token: "USDC", chain: "ethereum" },
      to: { token: "ETH", chain: "ethereum" },
      amountIn: "1000000000",
      minAmountOut: "500000000000000000" // slippage protection
    },
    {
      id: "step-3",
      type: "bridge",
      from: { token: "ETH", chain: "ethereum" },
      to: { token: "ETH", chain: "polygon" },
      amount: "500000000000000000"
    }
  ],
  arcPayload: {
    version: "1.0",
    steps: [...],
    deadline: 1715100000
  }
}
```

### ARC Integration

```typescript
// Orchestrator formats ARC payload
const arcPayload = {
  version: "1.0",
  routeId: "route-123",
  transactionId: "tx-456",
  recipient: userAddress,
  steps: [
    {
      type: "swap",
      chainId: 1,
      swapData: {
        tokenIn: "0x...",
        tokenOut: "0x...",
        amountIn: "1000000000",
        minAmountOut: "999000000",
        deadline: Math.floor(Date.now() / 1000) + 1800
      }
    }
    // More steps...
  ]
};

// Send to ARC (via frontend wallet signing)
// ARC then:
// - Selects best DEX at execution time
// - Accesses liquidity
// - Executes swaps
// - Executes bridges
// - Sends completion webhook
```

### When to Implement

- User selects a route
- System validates route integrity
- Orchestrator builds execution plan
- Returns to frontend with ARC payload
- Frontend presents to user for signing
- Signed tx → ARC

---

## 4. Transaction Tracker (`services/transaction-tracker.ts`)

### Purpose
Tracks transaction lifecycle in PostgreSQL from creation to completion.

### Transaction States

```
User initiates quote
    ↓
pending (quote created, waiting for user selection)
    ↓
routed (user selected a route)
    ↓
executing (sent to ARC, awaiting completion)
    ↓
completed ✓ (success)
    ↗
failed ✗ (error)
```

### Database Integration

```typescript
// Create transaction
const txId = await transactionTracker.create({
  userId: userAddress,
  sourceChain: "ethereum",
  destinationChain: "polygon",
  sourceToken: "0x...",
  destinationToken: "0x...",
  sourceAmount: "1000000000"
});
// Status: pending

// User selects a route
await transactionTracker.updateStatus(txId, "routed");

// Send to ARC
await transactionTracker.updateStatus(txId, "executing");

// ARC webhook arrives (success)
await transactionTracker.markCompleted(txId);
// Status: completed

// Or failure
await transactionTracker.markFailed(txId, "Bridge timeout");
// Status: failed
```

### Execution Logs

Every state change is logged:

```
execution_logs table:
│ transaction_id │ event      │ timestamp │ provider_response │
├────────────────┼────────────┼───────────┼──────────────────┤
│ tx-123         │ pending    │ 10:00:00  │ {...}             │
│ tx-123         │ routed     │ 10:01:00  │ {...}             │
│ tx-123         │ executing  │ 10:02:00  │ {...}             │
│ tx-123         │ completed  │ 10:30:00  │ finalOutput, hash │
```

---

## 5. REST API Endpoints

### Quote Endpoint

```
POST /api/quote

Request:
{
  "sourceChain": "ethereum",
  "destinationChain": "polygon",
  "sourceToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "destinationToken": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  "amount": "1000000000",
  "userAddress": "0x1234...",
  "strategy": "lowest-fee"
}

Response:
{
  "transactionId": "uuid-123",
  "quotes": [
    {
      "quoteId": "quote-1",
      "providerId": "lifi",
      "estimatedOutput": "999000000",
      "fees": {
        "gasFee": "50000000",
        "bridgeFee": "1000000",
        "total": "51000000"
      },
      "slippagePercent": 0.1,
      "estimatedTime": 300,
      "score": 0.95,
      "route": [...],
      "arcPayload": {...}
    }
  ],
  "selectedQuoteIndex": 0
}
```

### Execute Endpoint

```
POST /api/execute

Request:
{
  "transactionId": "uuid-123",
  "quoteId": "quote-1",
  "userAddress": "0x1234...",
  "signature": "0x..." // from user wallet
}

Response:
{
  "executionId": "exec-456",
  "transactionId": "uuid-123",
  "status": "executing",
  "arcPayload": {
    "version": "1.0",
    "steps": [...],
    "deadline": 1715100000
  },
  "estimatedCompletionTime": 300
}
```

### Transaction Status Endpoint

```
GET /api/transaction/:id

Response:
{
  "id": "uuid-123",
  "status": "executing",
  "sourceChain": "ethereum",
  "destinationChain": "polygon",
  "sourceAmount": "1000000000",
  "estimatedOutput": "999000000",
  "progress": {
    "currentStep": 2,
    "totalSteps": 3,
    "stepStatus": "bridging"
  },
  "createdAt": "2026-05-09T10:00:00Z",
  "updatedAt": "2026-05-09T10:05:00Z",
  "completedAt": null,
  "error": null
}
```

### Webhook Endpoint

```
POST /api/webhooks/execution
(Called by ARC when transactions complete)

Request (from ARC):
{
  "transactionId": "uuid-123",
  "status": "completed",
  "currentStep": 3,
  "totalSteps": 3,
  "finalOutput": "999000000",
  "completedAt": "2026-05-09T10:30:00Z",
  "txHash": "0x...",
  "error": null
}

Response:
{
  "received": true,
  "transactionId": "uuid-123"
}
```

---

## 6. Future Integrations

### Circle CCTP (Cross-Chain Transfer Protocol)

**Location:** `src/backend/aggregators/circle-cctp.ts`

**Integration Point:** Quote Engine

Circle CCTP becomes just another provider option:

```typescript
// In quote-engine.ts
if (CONFIGURATION.PROVIDERS.CIRCLE_CCTP.enabled) {
  quotePromises.push(this.fetchCircleCCTPQuote(request));
}

// In circle-cctp.ts
async fetchCircleCCTPQuote(request: QuoteRequest): Promise<NormalizedQuote> {
  // Call Circle API
  // Get CCTP-specific rates and fees
  // Normalize to our standard quote format
  // Build ARC-compatible payload
  return normalizedQuote;
}
```

**Why it fits here:**
- CCTP is just another routing option
- Quote Engine already handles multiple providers
- No changes needed to optimizer or execution layer
- CCTP becomes a "provider" like LI.FI or Socket

---

### Fiat Payout Integration

**Location:** `src/backend/services/fiat-settlement-service.ts`

**Integration Point:** After Transaction Completion

```typescript
// New service watches for completed transactions
// When transaction completes:
if (destinationIsStablecoin && userSelectedFiatPayout) {
  await fiatSettlementService.initiate({
    transactionId: "tx-123",
    finalAmount: "999000000", // USDC on destination
    destination: {
      type: "bank_account",
      accountNumber: "...",
      routingNumber: "...",
      bankName: "..."
    }
  });
}

// Fiat settlement service:
// - Calls Stripe/PayPal API
// - Creates fiat transfer
// - Tracks fiat settlement separately
// - Updates transaction with fiat status
```

**Why it's separate:**
- Fiat settlement is post-routing
- Doesn't affect crypto routing decisions
- Can fail independently of crypto transfer
- Requires compliance/KYC separate from routing

---

### ARC Interaction Details

**Data Flow:**

```
1. Backend sends ARC Payload
   {
     "steps": [
       {
         "type": "swap",
         "swapData": {
           "tokenIn": "0x...",
           "tokenOut": "0x...",
           "amountIn": "1000000000",
           "minAmountOut": "999000000",
           "deadline": 1715100000
         }
       },
       {
         "type": "bridge",
         "bridgeData": {
           "token": "0x...",
           "amount": "500000000000000000",
           "destinationChain": "polygon"
         }
       }
     ],
     "recipient": "0x1234..."
   }

2. ARC at runtime:
   - Reviews swap step → selects best DEX (Uniswap v3, Curve, etc.)
   - Reviews bridge step → selects best bridge (Lido, Stargate, etc.)
   - Accesses liquidity
   - Executes transactions
   - Tracks gas costs

3. ARC sends webhook callback:
   {
     "transactionId": "uuid-123",
     "status": "completed",
     "finalOutput": "999000000",
     "txHash": "0x...",
     "executionDetails": {...}
   }

4. Backend updates database:
   - Marks transaction as completed
   - Stores final output and hash
   - Logs execution details
```

**Key Point:** Backend never needs to know HOW ARC does it. We just describe WHAT needs to happen.

---

## 7. Frontend Communication

### Frontend → Backend Flow

```typescript
// 1. User initiates quote
fetch('/api/quote', {
  method: 'POST',
  body: JSON.stringify({
    sourceChain: 'ethereum',
    destinationChain: 'polygon',
    sourceToken: '0x...',
    destinationToken: '0x...',
    amount: '1000000000',
    userAddress: userWalletAddress,
    strategy: 'lowest-fee'
  })
})
.then(res => res.json())
.then(data => {
  // Display quote options to user
  // data.quotes = [quote1, quote2, ...]
  // User selects best one
});

// 2. User selects a route
const selectedQuote = data.quotes[0];
fetch('/api/execute', {
  method: 'POST',
  body: JSON.stringify({
    transactionId: data.transactionId,
    quoteId: selectedQuote.quoteId,
    userAddress: userWalletAddress,
    signature: await signMessage(...) // Sign via wallet
  })
})
.then(res => res.json())
.then(data => {
  // data.arcPayload = {...}
  // Present to user for wallet signing
  const tx = await userWallet.sendTransaction(data.arcPayload);
});

// 3. Poll for status
const pollStatus = () => {
  fetch(`/api/transaction/${data.transactionId}`)
    .then(res => res.json())
    .then(status => {
      if (status.status === 'completed') {
        // Show success
      } else if (status.status === 'failed') {
        // Show error
      } else {
        // Poll again in 5 seconds
        setTimeout(pollStatus, 5000);
      }
    });
};
```

---

## 8. Deployment Checklist

### Pre-Production

- [ ] All providers configured (API keys in env vars)
- [ ] Database migrations run
- [ ] ARC webhook secret configured
- [ ] CORS properly configured for frontend domain
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Error handling tested
- [ ] Provider fallbacks tested

### Post-Deployment

- [ ] Health check endpoint working
- [ ] Quote endpoint responsive (< 2s)
- [ ] ARC webhook endpoint accessible
- [ ] Database connections stable
- [ ] Monitoring/alerting set up
- [ ] Performance metrics being tracked
- [ ] Error logs being monitored

---

## 9. Development Workflow

### Phase 1: Core Logic (Current)
- [x] Type definitions
- [x] Quote engine structure
- [x] Route optimizer logic
- [x] API endpoints scaffolding
- [ ] Mock provider data for testing

### Phase 2: Provider Integration
- [ ] LI.FI API integration
- [ ] Socket API integration
- [ ] Relay API integration
- [ ] Error handling & fallbacks

### Phase 3: Database & Persistence
- [ ] Run migrations
- [ ] Implement transaction tracker
- [ ] Implement execution logs
- [ ] Add query builders

### Phase 4: Execution & Webhooks
- [ ] Implement orchestrator fully
- [ ] Add webhook handlers
- [ ] Add webhook signature verification
- [ ] Add transaction status updates

### Phase 5: Frontend Integration
- [ ] Connect frontend to backend API
- [ ] Implement polling for status
- [ ] Add error handling
- [ ] Add loading states

### Phase 6: Testing & Optimization
- [ ] Unit tests for each service
- [ ] Integration tests for full flow
- [ ] Performance testing
- [ ] Load testing

### Phase 7: Production Hardening
- [ ] Security audit
- [ ] Rate limiting implementation
- [ ] Monitoring setup
- [ ] Deployment automation

---

## 10. Common Issues & Solutions

### Quote takes > 2 seconds
- Issue: Slow provider API
- Solution: Set timeout, use fallback providers

### Route validation fails
- Issue: Quote stale or price changed
- Solution: Re-fetch quotes before executing

### ARC webhook not received
- Issue: Webhook URL not accessible
- Solution: Check CORS, firewall, network settings

### Transaction stuck in "executing"
- Issue: ARC didn't send webhook
- Solution: Implement timeout mechanism, manual retry

