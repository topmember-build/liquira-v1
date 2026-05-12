# LiQuira Backend - Visual Architecture Guide

Visual diagrams explaining how LiQuira's routing engine works.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LIQUIRA ECOSYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│   Web3 User Wallet      │
│  (MetaMask, Ledger...)  │
└────────┬────────────────┘
         │ Signs transactions
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              FRONTEND (React + TanStack Router)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Swap/Bridge UI                                                  │   │
│  │ - Select source/dest chains                                     │   │
│  │ - Enter amount                                                  │   │
│  │ - Display quote options                                         │   │
│  │ - Show progress during execution                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────┬──────────────────────────────────────────────────────┬──────────┘
         │ HTTP                                                 │ WebSocket
         │ (REST API calls)                                     │ (Status updates)
         ▼                                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     LIQUIRA BACKEND ROUTING ENGINE                       │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    QUOTE LAYER                                    │   │
│  │                                                                   │   │
│  │  Quote Request:                                                  │   │
│  │  - sourceChain: "ethereum"                                       │   │
│  │  - destChain: "polygon"                                          │   │
│  │  - sourceToken: USDC                                             │   │
│  │  - destToken: USDC.e                                             │   │
│  │  - amount: "1000000000"                                          │   │
│  │  - strategy: "lowest-fee"                                        │   │
│  │                                                                   │   │
│  │              ↓ (Parallel API Calls)                              │   │
│  │                                                                   │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │   │
│  │  │  LI.FI API     │  │  Socket API    │  │  Relay API     │   │   │
│  │  │  aggregator    │  │  aggregator    │  │  aggregator    │   │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘   │   │
│  │         ↓                   ↓                   ↓                │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │         QUOTE NORMALIZER                               │   │   │
│  │  │  - Convert to standard format                          │   │   │
│  │  │  - Calculate fees (gas + bridge)                       │   │   │
│  │  │  - Build route steps                                   │   │   │
│  │  │  - Generate ARC payloads                               │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                          ↓                                      │   │
│  │  NormalizedQuotes = [                                           │   │
│  │    { providerId: "lifi", estimatedOutput: "999000000", ... },  │   │
│  │    { providerId: "socket", estimatedOutput: "998900000", ... }, │   │
│  │    { providerId: "relay", estimatedOutput: "997500000", ... }   │   │
│  │  ]                                                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  OPTIMIZATION LAYER                              │   │
│  │                                                                   │   │
│  │  ┌─ Route Optimizer ─┐                                          │   │
│  │  │                   │                                          │   │
│  │  │ For each quote:   │                                          │   │
│  │  │  feeScore = 1 - (fees / maxFees)                             │   │
│  │  │  timeScore = 1 - (time / maxTime)                            │   │
│  │  │  slippageScore = 1 - (slippage / maxSlippage)                │   │
│  │  │                   │                                          │   │
│  │  │  If "lowest-fee": │                                          │   │
│  │  │   score = 0.5*feeScore + 0.3*timeScore + 0.2*slippageScore   │   │
│  │  └─ Ranking: 1st, 2nd, 3rd ─┘                                  │   │
│  │                                                                   │   │
│  │  RankedQuotes = [                                               │   │
│  │    { rank: 1, score: 0.95, recommended: true, ... },            │   │
│  │    { rank: 2, score: 0.85, recommended: false, ... },           │   │
│  │    { rank: 3, score: 0.72, recommended: false, ... }            │   │
│  │  ]                                                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              EXECUTION PLANNING LAYER                            │   │
│  │  (Called when user selects a route)                              │   │
│  │                                                                   │   │
│  │  Orchestrator builds execution plan:                             │   │
│  │  ┌───────────────────────────────────────────┐                  │   │
│  │  │ Step 1: Token Approval                    │                  │   │
│  │  │  - Approve USDC to ARC contract           │                  │   │
│  │  │  - Amount: 1000000000 wei                 │                  │   │
│  │  ├───────────────────────────────────────────┤                  │   │
│  │  │ Step 2: Swap                              │                  │   │
│  │  │  - From: USDC on Ethereum                 │                  │   │
│  │  │  - To: ETH on Ethereum                    │                  │   │
│  │  │  - Min output: 500000000000000000 wei     │                  │   │
│  │  │  (minAmountOut with slippage protection)  │                  │   │
│  │  ├───────────────────────────────────────────┤                  │   │
│  │  │ Step 3: Bridge                            │                  │   │
│  │  │  - From: ETH on Ethereum                  │                  │   │
│  │  │  - To: ETH on Polygon                     │                  │   │
│  │  │  - Recipient: user's wallet               │                  │   │
│  │  │  - Deadline: now + 30min                  │                  │   │
│  │  └───────────────────────────────────────────┘                  │   │
│  │                                                                   │   │
│  │  ARC Execution Payload:                                          │   │
│  │  {                                                               │   │
│  │    version: "1.0",                                               │   │
│  │    routeId: "route-123",                                         │   │
│  │    steps: [...],  // Structured steps above                      │   │
│  │    recipient: "0x1234...",                                       │   │
│  │    deadline: 1715100000                                          │   │
│  │  }                                                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │            TRANSACTION TRACKING LAYER                            │   │
│  │  (PostgreSQL Backend)                                            │   │
│  │                                                                   │   │
│  │  Store transaction state:                                        │   │
│  │  ┌─────────────────────────────────────────┐                    │   │
│  │  │ id: uuid-123                             │                    │   │
│  │  │ user_id: "0x1234..."                     │                    │   │
│  │  │ status: "pending" → "routed"             │                    │   │
│  │  │        → "executing" → "completed"       │                    │   │
│  │  │ source_amount: "1000000000"              │                    │   │
│  │  │ created_at: timestamp                    │                    │   │
│  │  └─────────────────────────────────────────┘                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
         │ Signed ARC Payload                    │ Webhook Callback
         │ (User signs via wallet)               │ (ARC completion)
         ▼                                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       ARC EXECUTION LAYER                                │
│                     (External Service)                                   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 1. Receives execution plan from frontend                         │   │
│  │ 2. Selects optimal DEX for swap (Uniswap, Curve, etc.)          │   │
│  │ 3. Accesses liquidity pools                                      │   │
│  │ 4. Executes swap: USDC → ETH                                    │   │
│  │ 5. Selects optimal bridge (Stargate, Lido, etc.)                │   │
│  │ 6. Executes bridge: ETH Ethereum → ETH Polygon                  │   │
│  │ 7. Transfers funds to recipient wallet                           │   │
│  │ 8. Sends webhook callback with completion status                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  Webhook: {                                                              │
│    transactionId: "uuid-123",                                            │
│    status: "completed",                                                  │
│    finalOutput: "999000000",                                             │
│    txHash: "0x...",                                                      │
│    completedAt: "2026-05-09T10:30:00Z"                                   │
│  }                                                                        │
└──────────────────────────────────────────────────────────────────────────┘
         │ Webhook callback
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Webhook Handler)                           │
│  Update transaction: status = "completed"                                │
│  Store final output and tx hash in database                              │
└──────────────────────────────────────────────────────────────────────────┘
         │ Status updated
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                          │
│  Poll GET /api/transaction/:id                                           │
│  See status = "completed"                                                │
│  Show success message and final amount to user                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Sequence Diagram

```
Timeline of a cross-chain swap from Ethereum USDC → Polygon USDC.e

T+0s    User initiates swap request
        │
        ├─→ Frontend sends POST /api/quote
        │
        ├─→ Backend Route Handler
        │   ├─ Validates input
        │   ├─ Generates transaction ID: uuid-123
        │   └─ Calls Quote Engine
        │
        ├─→ Quote Engine (ALL PARALLEL):
        │   ├─ LI.FI: Query routes API
        │   ├─ Socket: Query routes API
        │   └─ Relay: Query routes API
        │
        ├─→ Responses come back (1-2 seconds)
        │   ├─ LI.FI: "outputAmount": 999000000
        │   ├─ Socket: "outputAmount": 998900000
        │   └─ Relay: "outputAmount": 997500000
        │
        ├─→ Quote Normalizer:
        │   ├─ Convert to standard format
        │   ├─ Extract fees (gas + bridge)
        │   ├─ Parse route steps
        │   └─ Build ARC payloads
        │
        ├─→ Route Optimizer:
        │   ├─ Calculate scores:
        │   │  ├─ LI.FI: score = 0.95 ← BEST
        │   │  ├─ Socket: score = 0.85
        │   │  └─ Relay: score = 0.72
        │   └─ Rank and return
        │
T+2s    ├─→ Response sent to frontend:
        │   {
        │     "transactionId": "uuid-123",
        │     "quotes": [
        │       {rank: 1, providerId: "lifi", score: 0.95, ...},
        │       {rank: 2, providerId: "socket", score: 0.85, ...},
        │       {rank: 3, providerId: "relay", score: 0.72, ...}
        │     ],
        │     "selectedQuoteIndex": 0
        │   }
        │
        ├─→ Frontend displays 3 options to user
        │   User selects: "LI.FI route (0.95 score)"
        │
T+5s    ├─→ Frontend sends POST /api/execute
        │   {
        │     "transactionId": "uuid-123",
        │     "quoteId": "quote-1",
        │     "userAddress": "0x1234...",
        │     "signature": "0x..."
        │   }
        │
        ├─→ Backend Route Handler
        │   ├─ Validates request
        │   └─ Calls Orchestrator
        │
        ├─→ Orchestrator:
        │   ├─ Fetches route from database
        │   ├─ Validates freshness
        │   ├─ Plans execution sequence:
        │   │  ├─ Step 1: Approve USDC to ARC
        │   │  ├─ Step 2: Swap USDC → ETH
        │   │  └─ Step 3: Bridge ETH to Polygon
        │   ├─ Builds ARC payload
        │   └─ Returns to frontend
        │
T+6s    ├─→ Response sent to frontend:
        │   {
        │     "executionId": "exec-456",
        │     "status": "executing",
        │     "arcPayload": {
        │       "version": "1.0",
        │       "steps": [...]
        │     }
        │   }
        │
        ├─→ Frontend presents to user's wallet
        │   User signs transaction with MetaMask/Ledger
        │
T+10s   ├─→ Signed transaction sent to ARC
        │   (via blockchain or direct API)
        │
        ├─→ ARC receives payload:
        │   "Execute swaps and bridges based on these steps"
        │
        ├─→ ARC actions (EXECUTION_LAYER):
        │   ├─ Review swap step → Select best DEX
        │   │  └─ "Uniswap V3 has best rate for USDC → ETH"
        │   ├─ Execute swap on Ethereum
        │   │  ├─ Call Uniswap router
        │   │  ├─ Get ~0.5 ETH output
        │   │  └─ Gas cost: ~$50
        │   ├─ Review bridge step → Select best bridge
        │   │  └─ "Stargate has best rates for ETH bridging"
        │   ├─ Execute bridge to Polygon
        │   │  ├─ Call Stargate bridge
        │   │  ├─ Lock ETH on Ethereum
        │   │  └─ Release ETH on Polygon (5-15 seconds)
        │   └─ Transfer to recipient wallet
        │       └─ User receives ~0.5 ETH on Polygon
        │
T+30s   ├─→ ARC sends webhook callback:
        │   POST /api/webhooks/execution
        │   {
        │     "transactionId": "uuid-123",
        │     "status": "completed",
        │     "finalOutput": "999000000",
        │     "txHash": "0xabc123...",
        │     "completedAt": "2026-05-09T10:30:00Z"
        │   }
        │
        ├─→ Backend Webhook Handler:
        │   ├─ Verify signature
        │   ├─ Update transaction status → "completed"
        │   ├─ Store final output in database
        │   ├─ Store tx hash
        │   └─ Create execution log entry
        │
        ├─→ Frontend polls GET /api/transaction/uuid-123
        │   ├─ Status is still "executing"...
        │   └─ Poll again in 5 seconds
        │
        ├─→ Frontend polls again
        │   ├─ Status is now "completed"!
        │   ├─ Final output: 999000000
        │   └─ Show success message to user
        │
T+35s   └─→ User sees: "✓ Swap complete! You received 0.5 ETH on Polygon"
```

---

## Module Interaction Diagram

```
                    ┌────────────────┐
                    │  Express App   │
                    │  (index.ts)    │
                    └────────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │ Quote   │         │Execute  │         │Webhook  │
    │Route    │         │Route    │         │Route    │
    │Handler  │         │Handler  │         │Handler  │
    └────┬────┘         └────┬────┘         └────┬────┘
         │                   │                   │
         ▼                   ▼                   ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │Quote Engine  │    │Orchestrator  │    │Transaction  │
    │              │    │              │    │Tracker      │
    │• Fetch from  │    │• Build exec  │    │              │
    │  all APIs    │    │  plan        │    │• Update DB   │
    │• Normalize   │    │• Format ARC  │    │  status      │
    │  responses   │    │  payload     │    │• Store logs  │
    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
           │                   │                    │
           ▼                   ▼                    ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │Route         │    │Quote from DB │    │PostgreSQL    │
    │Optimizer     │    │              │    │Database      │
    │              │    │Validators    │    │              │
    │• Score routes│    │              │    │• transactions│
    │• Filter      │    │Error Handler │    │• routes      │
    │• Rank        │    │              │    │• quotes      │
    │              │    │Logger        │    │• exec_logs   │
    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
           │                   │                    │
           └───────────────────┴────────────────────┘
                       │
                       ▼
                  ┌──────────────┐
                  │ Response to  │
                  │ Frontend     │
                  └──────────────┘
```

---

## Quote Scoring Algorithm

```
Input: 3 quotes from different providers

Quote A (LI.FI):
  - Fees: 51,000,000 wei (fee score: 1.0)
  - Time: 300 seconds (time score: 1.0)
  - Slippage: 0.1% (slippage score: 1.0)

Quote B (Socket):
  - Fees: 60,000,000 wei (fee score: 0.82)
  - Time: 250 seconds (time score: 0.83)
  - Slippage: 0.15% (slippage score: 0.67)

Quote C (Relay):
  - Fees: 75,000,000 wei (fee score: 0.32)
  - Time: 450 seconds (time score: 0.0)
  - Slippage: 0.3% (slippage score: 0.0)

Strategy: "lowest-fee"
Weights: fees=50%, time=30%, slippage=20%

Calculations:
  Score(A) = (1.0 * 0.5) + (1.0 * 0.3) + (1.0 * 0.2) = 1.0 ✓ BEST
  Score(B) = (0.82 * 0.5) + (0.83 * 0.3) + (0.67 * 0.2) = 0.81
  Score(C) = (0.32 * 0.5) + (0.0 * 0.3) + (0.0 * 0.2) = 0.16

Result:
  1. Quote A (score: 1.0) ← RECOMMENDED
  2. Quote B (score: 0.81)
  3. Quote C (score: 0.16)

If strategy was "fastest":
Weights: fees=30%, time=50%, slippage=20%

Calculations:
  Score(A) = (1.0 * 0.3) + (1.0 * 0.5) + (1.0 * 0.2) = 1.0 ✓ BEST
  Score(B) = (0.82 * 0.3) + (0.83 * 0.5) + (0.67 * 0.2) = 0.80
  Score(C) = (0.32 * 0.3) + (0.0 * 0.5) + (0.0 * 0.2) = 0.10

Result:
  1. Quote A (score: 1.0) ← RECOMMENDED
  2. Quote B (score: 0.80)
  3. Quote C (score: 0.10)
```

---

## Execution Plan Structure

```
User selects: LI.FI route (1000 USDC on Ethereum → USDC.e on Polygon)

Orchestrator builds plan:

ExecutionPlan {
  id: "exec-plan-123",
  routeId: "route-456",
  transactionId: "uuid-789",
  
  steps: [
    {
      id: "step-1",
      type: "token-approval",
      status: "pending",
      data: {
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
        spender: "0xARC_ADDRESS",
        amount: "1000000000",
        chainId: 1 // Ethereum
      }
    },
    
    {
      id: "step-2",
      type: "swap",
      status: "pending",
      data: {
        chainId: 1,
        tokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
        tokenOut: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        amountIn: "1000000000",
        minAmountOut: "500000000000000000", // 0.5 ETH
        deadline: 1715100000 // 30 min from now
      }
    },
    
    {
      id: "step-3",
      type: "bridge",
      status: "pending",
      data: {
        chainId: 1,
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        amount: "500000000000000000",
        destinationChain: "polygon",
        recipient: "0x1234..." // User's wallet
      }
    }
  ],
  
  arcPayload: {
    version: "1.0",
    routeId: "route-456",
    transactionId: "uuid-789",
    recipient: "0x1234...",
    sourceChain: "ethereum",
    destinationChain: "polygon",
    
    steps: [
      {
        id: "arc-step-1",
        type: "swap",
        chainId: 1,
        swapData: {
          tokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          tokenOut: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          amountIn: "1000000000",
          minAmountOut: "500000000000000000",
          deadline: 1715100000
          // Note: No DEX specified! ARC chooses at runtime
        }
      },
      {
        id: "arc-step-2",
        type: "bridge",
        chainId: 1,
        bridgeData: {
          token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          amount: "500000000000000000",
          destinationChain: "polygon",
          recipient: "0x1234..."
          // Note: No bridge provider specified! ARC chooses at runtime
        }
      }
    ],
    
    deadline: 1715100000
  }
}
```

---

## Transaction State Machine

```
                    ┌──────────────┐
                    │   Created    │
                    │ (POST /quote)│
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
              ┌─────→ PENDING      │
              │     (waiting for  │
              │      user choice) │
              │     └──────┬───────┘
              │            │ User selects quote
              │            ▼
              │     ┌──────────────┐
              │     │   ROUTED     │
              │     │(route        │
              │     │selected,     │
              └─────│execution    │
                    │plan built) │
                    └──────┬───────┘
                           │ Frontend sends to wallet
                           │ User signs
                           │ Tx sent to ARC
                           ▼
                    ┌──────────────┐
                    │  EXECUTING   │◄──┐
                    │  (ARC is     │   │
                    │   working)   │   │
                    └──────┬───────┘   │
                           │           │
                ┌──────────┴───────┐   │
                │                  │   │
                ▼                  ▼   │
         ┌────────────┐    ┌────────────┐
         │ COMPLETED  │    │  FAILED    │──┐
         │ (Success)  │    │  (Error)   │  │
         └────────────┘    └────────────┘  │
                                           │
                      (Can retry with ────┘
                       different route)

Status Transitions via:
1. API: POST /api/execute (pending → routed)
2. ARC webhook: POST /api/webhooks/execution (executing → completed/failed)
```

---

## Database Relationships

```
┌──────────────────────┐
│   transactions       │
├──────────────────────┤
│ id (PK)              │
│ user_id              │◄──┐
│ source_chain         │   │
│ destination_chain    │   │
│ source_amount        │   │
│ status               │   │
│ route_id (FK)        │   │
│ created_at           │   │
│ updated_at           │   │
│ completed_at         │   │
└──────────────────────┘   │
         │                 │
         │ 1-to-Many       │
         ▼                 │
┌──────────────────────┐   │
│     routes           │   │
├──────────────────────┤   │
│ id (PK)              │   │
│ transaction_id (FK)  │───┘
│ provider_id          │
│ route_data (JSONB)   │
│ execution_steps      │
│ estimated_output     │
│ estimated_fees       │
│ estimated_time       │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│     quotes           │
├──────────────────────┤
│ id (PK)              │
│ transaction_id (FK)  │──┐
│ provider_id          │  │ 1-to-Many
│ quote_data (JSONB)   │  │
│ created_at           │  │
└──────────────────────┘  │
                          │
                          ▼
                   (transactions)

┌──────────────────────┐
│  execution_logs      │
├──────────────────────┤
│ id (PK)              │
│ transaction_id (FK)  │──┐
│ event (string)       │  │ 1-to-Many
│ provider_response    │  │
│ created_at           │  │
└──────────────────────┘  │
                          │
                          ▼
                   (transactions)
```

---

## Frontend-Backend API Contract

```
Frontend sends:
─────────────────

POST /api/quote
{
  sourceChain: "ethereum",
  destinationChain: "polygon",
  sourceToken: "0x...",
  destinationToken: "0x...",
  amount: "1000000000",
  userAddress: "0x1234...",
  strategy: "lowest-fee" | "fastest" | "lowest-slippage"
}

Backend returns:
────────────────

HTTP 200 OK
{
  transactionId: "uuid",
  quotes: [
    {
      quoteId: "quote-1",
      providerId: "lifi",
      estimatedOutput: "999000000",
      fees: { gasFee, bridgeFee, slippagePercent, total },
      estimatedTime: 300,
      score: 0.95,
      route: [...],
      arcPayload: {...}
    },
    ...
  ],
  selectedQuoteIndex: 0,
  timestamp: 1715000000
}

─────────────────────────────────────────────────────────────

Frontend sends:
─────────────────

POST /api/execute
{
  transactionId: "uuid",
  quoteId: "quote-1",
  userAddress: "0x1234...",
  signature: "0x..." // from wallet.signMessage()
}

Backend returns:
────────────────

HTTP 200 OK
{
  executionId: "exec-456",
  status: "executing",
  arcPayload: {
    version: "1.0",
    steps: [...],
    deadline: 1715100000
  },
  estimatedCompletionTime: 300
}

─────────────────────────────────────────────────────────────

Frontend sends:
─────────────────

GET /api/transaction/uuid

Backend returns:
────────────────

HTTP 200 OK
{
  id: "uuid",
  status: "executing",
  sourceChain: "ethereum",
  destinationChain: "polygon",
  sourceAmount: "1000000000",
  estimatedOutput: "999000000",
  progress: {
    currentStep: 2,
    totalSteps: 3,
    stepStatus: "bridging"
  },
  createdAt: "2026-05-09T10:00:00Z",
  updatedAt: "2026-05-09T10:05:00Z",
  completedAt: null,
  error: null
}

─────────────────────────────────────────────────────────────

ARC sends (Webhook):
────────────────────

POST /api/webhooks/execution
X-ARC-Signature: <HMAC-SHA256 signature>
{
  transactionId: "uuid",
  status: "completed",
  currentStep: 3,
  totalSteps: 3,
  finalOutput: "999000000",
  completedAt: "2026-05-09T10:30:00Z",
  txHash: "0xabc...",
  error: null
}

Backend responds:
─────────────────

HTTP 200 OK
{
  received: true,
  transactionId: "uuid",
  processedAt: "2026-05-09T10:30:01Z"
}
```

---

These diagrams should help visualize how LiQuira's backend works at different levels of abstraction. The key principles:

1. **Modular Design:** Each layer has a single responsibility
2. **Provider Abstraction:** We don't lock into specific providers
3. **Execution Delegation:** ARC handles the hard parts
4. **State Management:** Database tracks everything
5. **Async Processing:** Webhooks keep things responsive

