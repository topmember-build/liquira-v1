# LiQuira Backend Architecture

## System Overview

LiQuira is a cross-chain payment routing platform that abstracts crypto settlement complexity. The backend is responsible for **routing, quoting, and optimization only** — execution is delegated to ARC.

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (TanStack)                      │
│            Wallet Selection & Transaction UI                │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   LiQuira Backend                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Quote Engine                                        │   │
│  │  - LI.FI, Socket, Relay APIs                       │   │
│  │  - Normalize responses                             │   │
│  │  - Calculate fees & slippage                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Route Optimizer                                    │   │
│  │  - Score routes (fees, speed, slippage)           │   │
│  │  - Select optimal paths                           │   │
│  │  - Output execution instructions                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Swap + Bridge Orchestrator                         │   │
│  │  - Plan execution sequence (no actual execution)  │   │
│  │  - Define token approvals                         │   │
│  │  - Format ARC execution payload                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Transaction Tracker                                │   │
│  │  - Store tx lifecycle (pending → completed)       │   │
│  │  - PostgreSQL backend                             │   │
│  │  - Webhook handlers for ARC status updates        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ ARC Execution Payload (JSON)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    ARC Execution Layer                       │
│  - Execute swaps/bridges                                    │
│  - Manage liquidity                                         │
│  - Select providers at runtime                              │
│  - Handle provider orchestration                            │
│  - Send completion callbacks                                │
└─────────────────────────────────────────────────────────────┘
```

## Module Responsibilities

### 1. Quote Engine (`services/quote-engine.ts`)
**Purpose:** Fetch and normalize quotes from multiple routing APIs

**Inputs:**
```typescript
{
  sourceChain: "ethereum",
  destinationChain: "polygon",
  sourceToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  destinationToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC.e
  amount: "1000000000" // 1000 USDC in wei
}
```

**Provider Aggregation:**
- **LI.FI API:** Best for complex multi-hop routes
- **Socket API:** Best for speed and optimization
- **Relay API:** Best for bridge-specific routes

**Outputs:**
```typescript
{
  quotes: [
    {
      providerId: "lifi",
      estimatedOutput: "999000000",
      fees: { gas: "50000000", bridge: "1000000" },
      executionTime: 300,
      route: [...], // normalized route steps
      arcPayload: {...} // formatted for ARC
    }
  ],
  selectedQuote: 0,
  timestamp: 1715000000
}
```

**Key Feature:** Quotes remain **execution-agnostic**. No selection of final provider. Only candidate routes normalized for ARC.

---

### 2. Route Optimizer (`services/route-optimizer.ts`)
**Purpose:** Score and select the best route based on user preferences

**Scoring Algorithm:**
```
score = (1 - fees_ratio) * 0.5 + 
        (1 - time_ratio) * 0.3 + 
        (1 - slippage_ratio) * 0.2

where:
  fees_ratio = route_fees / max_fees_in_set
  time_ratio = settlement_time / max_time_in_set
  slippage_ratio = slippage / max_slippage_in_set
```

**Optimization Strategies:**
1. **Fee-optimized:** Minimize fees (default for transfers)
2. **Time-optimized:** Minimize settlement time (default for urgent payments)
3. **Slippage-optimized:** Minimize slippage (for stablecoin transfers)

**Output:**
```typescript
{
  selectedRoute: {
    providerId: "lifi",
    route: [...],
    executionPlan: {
      steps: [
        { type: "approve", token: "USDC", spender: "ARC_ADDRESS" },
        { type: "swap", from: "USDC", to: "ETH", pool: "uniswap" },
        { type: "bridge", from: "ethereum", to: "polygon" }
      ],
      arcPayload: {...}
    }
  }
}
```

---

### 3. Swap + Bridge Orchestrator (`services/orchestrator.ts`)
**Purpose:** Construct deterministic execution plans (planning only, no execution)

**Responsibilities:**
- ❌ Do NOT execute transactions
- ✅ Plan execution sequence
- ✅ Define token approvals needed
- ✅ Format execution instructions for ARC
- ✅ Handle contingency plans

**Execution Plan Structure:**
```typescript
{
  id: "execution-plan-123",
  routeId: "route-456",
  transactionId: "tx-789",
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
      provider: "uniswap-v3",
      amountIn: "1000000000",
      minAmountOut: "500000000000000000"
    },
    {
      id: "step-3",
      type: "bridge",
      from: { token: "ETH", chain: "ethereum" },
      to: { token: "ETH", chain: "polygon" },
      provider: "lifi-bridge",
      amount: "500000000000000000"
    }
  ],
  arcPayload: {
    // Structured data for ARC to execute
    // ARC handles provider selection at execution time
  }
}
```

---

### 4. Transaction Tracker (`services/transaction-tracker.ts`)
**Purpose:** Track transaction lifecycle in PostgreSQL

**Transaction States:**
```
pending → routed → executing (via ARC) → completed
                                      ↘ failed
```

**Database Schema:**
```sql
-- transactions table
id (UUID)
user_id (UUID) - references users
source_chain (string)
destination_chain (string)
source_token (string)
destination_token (string)
source_amount (bigint - wei)
status (enum: pending, routed, executing, completed, failed)
route_id (UUID) - foreign key
selected_quote_id (UUID)
execution_plan_id (UUID)
created_at (timestamp)
updated_at (timestamp)
completed_at (timestamp)
error_message (string)

-- routes table
id (UUID)
transaction_id (UUID) - foreign key
provider_id (string) - "lifi", "socket", "relay"
route_data (jsonb) - full route response
execution_steps (jsonb) - orchestration plan
estimated_output (bigint)
estimated_fees (bigint)
estimated_time (integer - seconds)
slippage_percent (decimal)
created_at (timestamp)

-- quotes table
id (UUID)
transaction_id (UUID) - foreign key
provider_id (string)
quote_data (jsonb) - full provider response
created_at (timestamp)

-- execution_logs table
id (UUID)
transaction_id (UUID) - foreign key
event (string) - "initiated", "executing", "completed", "failed"
provider_response (jsonb)
created_at (timestamp)
```

**Lifecycle:**
1. User requests quote → **pending**
2. Route selected → **routed**
3. Sent to ARC → **executing**
4. ARC sends completion webhook → **completed** or **failed**

---

## Data Flow

### Quote Flow
```
Frontend Request
    ↓
POST /api/quote
    ↓
Quote Engine
    ├─ Fetch LI.FI quote
    ├─ Fetch Socket quote
    ├─ Fetch Relay quote
    └─ Normalize all responses
    ↓
Route Optimizer
    ├─ Score each route
    └─ Return ranked quotes
    ↓
Transaction Tracker
    └─ Store quote data
    ↓
Response to Frontend (list of options)
```

### Execute Flow
```
Frontend Request (user selects route)
    ↓
POST /api/execute
    ↓
Route Validator (verify route integrity)
    ↓
Swap + Bridge Orchestrator
    ├─ Plan execution sequence
    └─ Format ARC payload
    ↓
Transaction Tracker
    ├─ Create execution plan
    └─ Update status → "executing"
    ↓
Response with ARC payload → Frontend
    ↓
Frontend → User Wallet (sign transaction with ARC payload)
    ↓
Signed transaction → ARC (external system)
    ↓
ARC → Execution (swaps, bridges, liquidity access)
    ↓
ARC Callback Webhook → /api/webhooks/execution
    ↓
Transaction Tracker (update status → "completed")
    ↓
Frontend polls GET /api/transaction/:id (sees "completed")
```

---

## API Endpoints

### `POST /api/quote`
Get route quotes from multiple providers

**Request:**
```json
{
  "sourceChain": "ethereum",
  "destinationChain": "polygon",
  "sourceToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "destinationToken": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  "amount": "1000000000",
  "userAddress": "0x1234...",
  "strategy": "lowest-fee" // or "fastest", "lowest-slippage"
}
```

**Response:**
```json
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
      "route": [...],
      "score": 0.95
    }
  ],
  "selectedQuoteIndex": 0
}
```

### `POST /api/execute`
Execute a selected route (sends to ARC)

**Request:**
```json
{
  "transactionId": "uuid-123",
  "quoteId": "quote-1",
  "userAddress": "0x1234...",
  "signature": "0x..." // optional for multi-sig
}
```

**Response:**
```json
{
  "executionId": "exec-456",
  "status": "executing",
  "arcPayload": {
    "steps": [...],
    "signatures": [...]
  },
  "estimatedCompletionTime": 300
}
```

### `GET /api/transaction/:id`
Get transaction status

**Response:**
```json
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
  "completedAt": null,
  "error": null
}
```

### `POST /api/webhooks/execution`
Receives execution updates from ARC

**Request (from ARC):**
```json
{
  "transactionId": "uuid-123",
  "status": "completed",
  "finalOutput": "999000000",
  "completedAt": "2026-05-09T10:00:00Z",
  "txHash": "0x..."
}
```

### `GET /api/health`
Health check

---

## Future Integration Points

### Circle CCTP (Cross-Chain Transfer Protocol)
**Where it fits:** In the Quote Engine as a new provider
```typescript
// In aggregators/circle-cctp.ts
- Fetch CCTP quotes for stablecoin transfers
- Integrate with Circle API
- Normalize response to standard quote format
- CCTP becomes just another route option
```

### Fiat Payout Integration
**Where it fits:** New service layer above Transaction Tracker
```typescript
// In services/fiat-settlement-service.ts
- Monitor completed transactions
- When destination is fiat payout:
  - Route to fiat provider (e.g., Stripe, PayPal)
  - Track fiat settlement separately
  - Update transaction with fiat status
- Does NOT change routing logic
```

### ARC Integration Details
**How ARC receives execution data:**

```typescript
// In services/orchestrator.ts
arcPayload = {
  version: "1.0",
  routeId: "route-123",
  steps: [
    {
      type: "swap",
      from: { token: "0x...", amount: "1000000000", chain: "ethereum" },
      to: { token: "0x...", chain: "ethereum" },
      // ARC selects provider at execution time
      // We don't specify which DEX - ARC optimizes
      minOutput: "500000000000000000"
    },
    {
      type: "bridge",
      from: { token: "0x...", amount: "500000000000000000", chain: "ethereum" },
      to: { chain: "polygon" },
      // ARC selects bridge provider at execution time
    }
  ],
  recipient: "0x...", // destination wallet
  deadline: 1715100000 // execution deadline
}

// ARC's responsibility:
// - Select actual DEX for swap
// - Select actual bridge provider
// - Access liquidity pools
// - Execute transactions
// - Send status webhooks back
```

---

## Security Considerations

1. **Input Validation:** All user inputs validated with Zod schemas
2. **Rate Limiting:** Per-user rate limits on /quote and /execute endpoints
3. **Authentication:** User authentication required; no private keys stored
4. **Environment Variables:** All API keys, DB credentials in `.env`
5. **CORS:** Restricted to frontend domain
6. **Logging:** All API calls logged (not including sensitive data)
7. **Error Handling:** Generic errors returned to clients; detailed errors in server logs

---

## Folder Structure

```
src/backend/
├── config/
│   ├── environment.ts       # Env variables & validation
│   ├── database.ts          # PostgreSQL connection
│   └── constants.ts         # Contract addresses, chain IDs
├── types/
│   ├── quote.types.ts       # Quote-related types
│   ├── route.types.ts       # Route-related types
│   ├── transaction.types.ts # Transaction types
│   └── arc.types.ts         # ARC payload types
├── models/
│   ├── transaction.model.ts # Transaction ORM/queries
│   ├── route.model.ts       # Route queries
│   └── quote.model.ts       # Quote queries
├── aggregators/
│   ├── lifi-aggregator.ts   # LI.FI API integration
│   ├── socket-aggregator.ts # Socket API integration
│   ├── relay-aggregator.ts  # Relay API integration
│   └── quote-normalizer.ts  # Normalize all providers
├── services/
│   ├── quote-engine.ts      # Main quote aggregation
│   ├── route-optimizer.ts   # Route scoring & selection
│   ├── orchestrator.ts      # Execution planning
│   ├── transaction-tracker.ts # Tx lifecycle management
│   └── arc-formatter.ts     # Format ARC payloads
├── middleware/
│   ├── auth.ts              # User authentication
│   ├── rate-limit.ts        # Rate limiting
│   ├── error-handler.ts     # Global error handler
│   └── request-validator.ts # Input validation
├── routes/
│   ├── quote.routes.ts      # Quote endpoints
│   ├── execute.routes.ts    # Execute endpoints
│   ├── transaction.routes.ts # Transaction endpoints
│   ├── webhook.routes.ts    # ARC webhooks
│   └── health.routes.ts     # Health check
├── utils/
│   ├── logger.ts            # Logging utilities
│   ├── errors.ts            # Custom error classes
│   ├── validators.ts        # Zod schemas
│   └── helpers.ts           # General utilities
├── db/
│   ├── migrations/          # SQL migration files
│   └── seeds/               # Seed data
└── index.ts                 # Express app setup
```

---

## Development Workflow

1. **Start with mock providers** using hardcoded quote responses
2. **Test routing logic** without calling external APIs
3. **Integrate one provider at a time** (start with LI.FI)
4. **Add database schema** after logic is solid
5. **Integrate ARC payload formatting** once execution plan is finalized
6. **Add webhook handlers** for ARC callbacks
7. **Deploy to staging** for E2E testing
8. **Monitor and optimize** based on real provider performance

