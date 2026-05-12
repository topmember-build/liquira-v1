# 🚀 MCP Server Quick Start Guide

## What is Installed?

✅ MCP (Model Context Protocol) server for Dynamic Fireblocks integration
- 4 core wallet management tools
- REST API endpoints
- Type-safe request validation
- Comprehensive error handling
- CORS enabled

## Files Created

| File | Purpose |
|------|---------|
| `src/server/mcp-server.ts` | MCP tool implementations |
| `src/routes/mcp.ts` | Metadata discovery endpoint |
| `src/routes/mcp.tools.$toolName.ts` | Tool invocation endpoint |
| `src/examples/mcp-client.js` | Example client & test tool |
| `MCP_FIREBLOCKS_SETUP.md` | Complete setup documentation |
| `MCP_SETUP_COMPLETE.md` | Implementation details |
| `MCP_CHECKLIST.md` | Status & next steps |
| `.env.example` | Configuration template |

## 5-Minute Setup

### Step 1: Update Environment
```bash
# Edit .env file
FIREBLOCKS_API_KEY=your_actual_key
FIREBLOCKS_API_SECRET=your_actual_secret
```

### Step 2: Start Server
```bash
npm run dev
# or with bun
bun run dev
```

### Step 3: Test MCP
```bash
# Check if server is running
curl http://localhost:3000/mcp

# You should see:
# {
#   "status": "ok",
#   "tools": ["create_wallet", "get_balance", "send_transaction", "get_transaction_status"]
# }
```

## API Endpoints

### GET /mcp
**Discover** available tools and server capabilities

```bash
curl http://localhost:3000/mcp
```

### POST /mcp/tools/create_wallet
**Create** a new custodial wallet

```bash
curl -X POST http://localhost:3000/mcp/tools/create_wallet \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "displayName": "My Wallet"
  }'
```

Response:
```json
{
  "success": true,
  "wallet": {
    "vaultAccountId": "123456",
    "address": "0x...",
    "name": "User_123-Wallet"
  }
}
```

### POST /mcp/tools/get_balance
**Check** wallet balance

```bash
curl -X POST http://localhost:3000/mcp/tools/get_balance \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "assetId": "ARC_USDC"
  }'
```

Response:
```json
{
  "success": true,
  "balance": 1000.50,
  "assetId": "ARC_USDC"
}
```

### POST /mcp/tools/send_transaction
**Send** a transaction

```bash
curl -X POST http://localhost:3000/mcp/tools/send_transaction \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "destinationAddress": "0x8c258e75c0d4b025e211f14a898e350b4d8e69ec",
    "amount": 100,
    "toCurrency": "USDC"
  }'
```

Response:
```json
{
  "success": true,
  "transactionId": "txn_abc123",
  "status": "created"
}
```

### POST /mcp/tools/get_transaction_status
**Track** transaction status

```bash
curl -X POST http://localhost:3000/mcp/tools/get_transaction_status \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "txn_abc123"
  }'
```

Response:
```json
{
  "success": true,
  "status": "COMPLETED"
}
```

## Testing Tools

### Run Example Workflow
```bash
node src/examples/mcp-client.js
```
This runs through: create wallet → check balance → send transaction → check status

### Test Specific Tool
```bash
node src/examples/mcp-client.js tool get_balance '{"userId":"test_user"}'
```

### Get Server Metadata
```bash
node src/examples/mcp-client.js metadata
```

## Configuration

### Required
```env
FIREBLOCKS_API_KEY=your_key
FIREBLOCKS_API_SECRET=your_secret
MCP_ENABLED=true
```

### Optional
```env
FIREBLOCKS_BASE_URL=https://api.fireblocks.io/v1
MCP_PORT=3000
MCP_HOST=0.0.0.0
```

See `.env.example` for complete template.

## Integration Points

### With FX Engine
```
POST /fx/execute
  ↓
calculate_output()
  ↓
mcp.sendTransaction()
  ↓
Fireblocks API
```

### With Dynamic Auth
- User identified by `userId`
- Wallet tied to user identity
- Transactions authorized by Fireblocks

## Error Handling

All endpoints return standardized responses:

**Success:**
```json
{
  "success": true,
  "balance": 100,
  "assetId": "ARC_USDC"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Fireblocks not configured. Set FIREBLOCKS_API_KEY..."
}
```

## Common Issues

### "Fireblocks not configured"
**Solution**: Set `FIREBLOCKS_API_KEY` and `FIREBLOCKS_API_SECRET` in `.env`

### Connection timeout
**Solution**: Check network connectivity to `api.fireblocks.io`

### Invalid credentials
**Solution**: Verify API key/secret in Fireblocks console

### "Unknown tool"
**Solution**: Check tool name matches one of:
- `create_wallet`
- `get_balance`
- `send_transaction`
- `get_transaction_status`

## Next Steps

1. ✅ Server is running locally
2. 📋 Test all endpoints with curl
3. 🔐 Set real Fireblocks credentials
4. 🚀 Deploy to production
5. 📊 Monitor transactions

## Documentation

- **Setup Guide**: `MCP_FIREBLOCKS_SETUP.md`
- **Implementation**: `MCP_SETUP_COMPLETE.md`
- **Status**: `MCP_CHECKLIST.md`

## Support

For detailed documentation, see:
- `MCP_FIREBLOCKS_SETUP.md` - Complete API reference
- `src/examples/mcp-client.js` - Example implementations
- `.env.example` - Configuration template

---

**Ready to go!** 🎉

Start with: `npm run dev` then `curl http://localhost:3000/mcp`
