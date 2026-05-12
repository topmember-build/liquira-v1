# LiQuira Backend - Quick Start Guide

Get the routing engine up and running in 15 minutes.

---

## Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL 13+ (or Supabase database)
- Git
- A code editor (VS Code recommended)

---

## 1. Clone & Install

```bash
# Navigate to project
cd liquira-v1

# Install dependencies
npm install
# or
pnpm install

# The backend uses the same package.json as frontend
# Additional backend dependencies to install:
npm install express cors uuid axios
npm install --save-dev @types/express @types/node
```

---

## 2. Database Setup

### Option A: Supabase (Recommended for MVP)

```bash
# Create Supabase project at https://supabase.com

# Get connection string from Supabase dashboard
# Settings → Database → Connection String

# Run migrations
# 1. Go to Supabase dashboard
# 2. SQL Editor → New Query
# 3. Copy contents of src/backend/db/001_init_schema.sql
# 4. Run the query
```

### Option B: Local PostgreSQL

```bash
# Create database
createdb liquira_dev

# Run migrations
psql liquira_dev < src/backend/db/001_init_schema.sql

# Or manually run each CREATE TABLE statement
```

---

## 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values:
BACKEND_DATABASE_URL=postgresql://...
LIFI_API_KEY=your_api_key_here
SOCKET_API_KEY=your_api_key_here
ARC_ADDRESS=0x...
ARC_WEBHOOK_SECRET=your_secret_here
```

**Get API Keys:**
- LI.FI: https://li.fi/dashboard
- Socket: https://app.socket.tech/
- Relay: https://relay.app/dashboard

---

## 4. Start the Backend

### Development Mode

```bash
# Terminal 1: Run Express server
npm run dev:backend

# Server starts at http://localhost:3000
# API endpoints:
# - GET /api/health
# - POST /api/quote
# - POST /api/execute
# - GET /api/transaction/:id
# - POST /api/webhooks/execution
```

### Or build and run

```bash
npm run build
npm run start:backend
```

---

## 5. Test the API

### Health Check

```bash
curl http://localhost:3000/api/health

# Response:
# {
#   "status": "ok",
#   "timestamp": "2026-05-09T10:00:00Z",
#   "environment": "development"
# }
```

### Get Quotes

```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "sourceChain": "ethereum",
    "destinationChain": "polygon",
    "sourceToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "destinationToken": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "amount": "1000000000",
    "userAddress": "0x1234567890123456789012345678901234567890",
    "strategy": "lowest-fee"
  }'
```

### Response

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
        "slippagePercent": 0.1,
        "total": "51000000"
      },
      "estimatedTime": 300,
      "score": 0.95,
      "route": [...],
      "arcPayload": {...}
    }
  ],
  "selectedQuoteIndex": 0,
  "timestamp": 1715000000
}
```

---

## 6. Folder Structure Overview

```
src/backend/
├── config/               # Configuration
│   └── environment.ts    # Env vars & validation
├── types/                # TypeScript types
│   └── index.ts
├── services/             # Core business logic
│   ├── quote-engine.ts   # Fetch & normalize quotes
│   ├── route-optimizer.ts # Score & rank routes
│   └── orchestrator.ts    # Plan execution
├── routes/               # API endpoints
│   ├── quote.routes.ts
│   ├── execute.routes.ts
│   ├── transaction.routes.ts
│   └── webhook.routes.ts
├── utils/                # Utilities
│   ├── logger.ts
│   ├── errors.ts
│   └── validators.ts
├── db/                   # Database
│   ├── schema.ts
│   └── 001_init_schema.sql
├── middleware/           # Express middleware (coming soon)
└── index.ts              # Express app setup
```

---

## 7. Development Workflow

### 1. Start Backend

```bash
npm run dev:backend
```

### 2. Start Frontend (in another terminal)

```bash
npm run dev
```

### 3. Test Quote Flow

- Open frontend at http://localhost:5173
- Go to swap/routing page
- Select source/dest chains and amount
- Click "Get Quotes"
- Frontend calls POST /api/quote
- Backend fetches from providers
- Responses appear in UI

### 4. Monitor Logs

Backend logs appear in terminal:

```
[2026-05-09T10:00:00Z] INFO: Quote request received {
  from: 'ethereum',
  to: 'polygon',
  amount: '1000000000'
}
[2026-05-09T10:00:01Z] INFO: Quote Engine: Fetching quotes
[2026-05-09T10:00:02Z] DEBUG: Fetching LI.FI quote
[2026-05-09T10:00:03Z] INFO: Quote response sent
```

---

## 8. Mock Data Mode (for testing without APIs)

If you don't have API keys yet, use mock data:

### Edit `src/backend/services/quote-engine.ts`

Replace provider calls with mock data:

```typescript
// In Quote Engine
private async fetchLiFiQuote(request: QuoteRequest): Promise<NormalizedQuote> {
  // MOCK MODE - return fake data
  return {
    quoteId: `mock-lifi-${Date.now()}`,
    providerId: "lifi",
    estimatedOutput: "999000000",
    estimatedOutputUSD: 999,
    fees: {
      gasFee: "50000000",
      bridgeFee: "1000000",
      slippagePercent: 0.1,
      total: "51000000"
    },
    estimatedTime: 300,
    route: [{
      id: "step-1",
      type: "swap",
      from: { token: request.sourceToken, chain: request.sourceChain, amount: request.amount },
      to: { token: request.destinationToken, chain: request.sourceChain }
    }],
    rawResponse: {},
    score: 0,
    arcPayload: {}
  };
}
```

Now quotes will work without API keys!

---

## 9. Debugging

### Enable Debug Logging

```bash
# In .env.local
BACKEND_LOG_LEVEL=debug

# Restart server
npm run dev:backend
```

### Database Debugging

```bash
# Connect to database
psql -d liquira_dev

# List tables
\dt

# Check transactions
SELECT * FROM transactions;

# Check quotes
SELECT * FROM quotes;

# View execution logs
SELECT * FROM execution_logs;
```

### Network Debugging

```bash
# Monitor API calls with httpie
http POST localhost:3000/api/quote \
  sourceChain=ethereum \
  destinationChain=polygon \
  sourceToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  destinationToken=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  amount=1000000000 \
  userAddress=0x1234567890123456789012345678901234567890
```

---

## 10. Next Steps

### Phase 1: Core Testing
- [x] Server starts without errors
- [x] /api/health responds
- [ ] Quote endpoint returns data (mock or real)
- [ ] Route optimizer ranks quotes

### Phase 2: Database Integration
- [ ] Transactions table being populated
- [ ] Quote history stored
- [ ] Execution logs working

### Phase 3: Frontend Integration
- [ ] Frontend calls POST /api/quote
- [ ] Quote list displays
- [ ] User selects route
- [ ] Frontend calls POST /api/execute

### Phase 4: ARC Integration
- [ ] Execution plan sent to ARC
- [ ] ARC webhook endpoint working
- [ ] Transaction status updates

### Phase 5: Hardening
- [ ] Error handling
- [ ] Rate limiting
- [ ] Provider fallbacks
- [ ] Webhook verification

---

## 11. Common Commands

```bash
# Start backend
npm run dev:backend

# Start frontend
npm run dev

# Run both
npm run dev:backend &
npm run dev

# Build production
npm run build

# View logs
tail -f server.log

# Check environment
node -e "console.log(process.env.BACKEND_DATABASE_URL)"

# Run migrations manually
psql < src/backend/db/001_init_schema.sql
```

---

## 12. Troubleshooting

### "PORT 3000 already in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev:backend
```

### "Cannot find module 'express'"
```bash
npm install express cors axios uuid
```

### "Database connection refused"
```bash
# Check DATABASE_URL in .env.local
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# For Supabase, check dashboard for connection string
```

### "API key invalid"
```bash
# Regenerate API keys from provider dashboards
# Update .env.local
# Restart server
```

---

## 13. API Documentation

Full API docs coming soon, but quick reference:

### POST /api/quote
Fetch quotes from multiple providers

### POST /api/execute
Execute a selected route

### GET /api/transaction/:id
Get transaction status

### POST /api/webhooks/execution
Receive ARC completion callbacks

### GET /api/health
Health check

---

## 14. Support

- Check [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) for detailed architecture
- Check [BACKEND_MODULE_GUIDE.md](./BACKEND_MODULE_GUIDE.md) for module explanations
- Check logs: `npm run dev:backend` shows all activities
- Check database: Query PostgreSQL directly to inspect state

Happy routing! 🚀
