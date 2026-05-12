# MCP Server Setup: Dynamic Fireblocks Integration

## Overview

This MCP (Model Context Protocol) server provides a standardized interface for managing custodial wallets via Fireblocks while leveraging Dynamic's wallet authentication framework.

## Features

- **Wallet Management**: Create and manage Fireblocks vault accounts for users
- **Balance Queries**: Fetch real-time wallet balances
- **Transaction Signing**: Create and sign transactions using Fireblocks custody
- **Status Tracking**: Monitor transaction status in real-time
- **REST API Bridge**: HTTP endpoints for tool invocation

## Architecture

```
┌─────────────────────┐
│   MCP Client        │
│  (IDE, Tools, etc)  │
└──────────┬──────────┘
           │
           │ HTTP/REST
           │
┌──────────▼──────────────────────┐
│   TanStack Router Endpoints      │
│  GET  /mcp                       │ (Metadata)
│  POST /mcp/tools/{toolName}      │ (Tool invocation)
└──────────┬──────────────────────┘
           │
┌──────────▼──────────────────────┐
│   MCP Server Layer               │
│  - mcpCreateWallet               │
│  - mcpGetBalance                 │
│  - mcpSendTransaction            │
│  - mcpGetTransactionStatus       │
└──────────┬──────────────────────┘
           │
┌──────────▼──────────────────────┐
│   Fireblocks Provider            │
│  - createDynamicWallet           │
│  - getWalletBalance              │
│  - signAndSendTransaction        │
│  - getTransactionStatus          │
└──────────┬──────────────────────┘
           │
┌──────────▼──────────────────────┐
│   Fireblocks API                 │
│  https://api.fireblocks.io/v1    │
└──────────────────────────────────┘
```

## API Endpoints

### Metadata Discovery

```bash
GET /mcp

Response:
{
  "status": "ok",
  "version": "1.0.0",
  "name": "Dynamic Fireblocks MCP",
  "capabilities": {
    "tools": true,
    "resources": true,
    "fireblocks": true
  },
  "tools": [
    "create_wallet",
    "get_balance",
    "send_transaction",
    "get_transaction_status"
  ]
}
```

### Create Wallet

```bash
POST /mcp/tools/create_wallet

Body:
{
  "userId": "user_123",
  "displayName": "My Custodial Wallet"
}

Response:
{
  "success": true,
  "wallet": {
    "vaultAccountId": "123456",
    "address": "0x...",
    "name": "User_123-Wallet"
  }
}
```

### Get Balance

```bash
POST /mcp/tools/get_balance

Body:
{
  "userId": "user_123",
  "assetId": "ARC_USDC"
}

Response:
{
  "success": true,
  "balance": 1000.50,
  "assetId": "ARC_USDC"
}
```

### Send Transaction

```bash
POST /mcp/tools/send_transaction

Body:
{
  "userId": "user_123",
  "destinationAddress": "0x8c258e75c0d4b025e211f14a898e350b4d8e69ec",
  "amount": 100,
  "toCurrency": "USDC",
  "note": "Settlement transfer"
}

Response:
{
  "success": true,
  "transactionId": "txn_abc123def456",
  "status": "created"
}
```

### Get Transaction Status

```bash
POST /mcp/tools/get_transaction_status

Body:
{
  "transactionId": "txn_abc123def456"
}

Response:
{
  "success": true,
  "status": "COMPLETED"
}
```

## Environment Configuration

Required `.env` variables:

```env
# Fireblocks API Credentials
FIREBLOCKS_API_KEY=your_api_key
FIREBLOCKS_API_SECRET=your_api_secret
FIREBLOCKS_BASE_URL=https://api.fireblocks.io/v1

# MCP Server Configuration
MCP_ENABLED=true
MCP_PORT=3000
MCP_HOST=0.0.0.0
```

## Integration with FX Engine

The MCP server integrates seamlessly with the existing FX execution engine:

```typescript
// FX Execute Route → MCP Server
POST /fx/execute
→ calculate_output()
→ mcp.sendTransaction()
→ Fireblocks API
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Fireblocks not configured. Set FIREBLOCKS_API_KEY and FIREBLOCKS_API_SECRET."
}
```

## Security Considerations

1. **API Key Protection**: Store Fireblocks credentials in `.env` (never commit)
2. **Request Validation**: All MCP tool inputs are validated with Zod schemas
3. **CORS**: Endpoints include CORS headers for cross-origin requests
4. **User Isolation**: Each tool validates user authorization (implement in production)

## Testing

### Test Metadata Endpoint

```bash
curl -X GET http://localhost:3000/mcp
```

### Test Tool Invocation

```bash
curl -X POST http://localhost:3000/mcp/tools/get_balance \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","assetId":"ARC_USDC"}'
```

## Next Steps

1. **Configure Fireblocks Credentials**: Update `.env` with your API key/secret
2. **Test Connectivity**: Verify Fireblocks API access
3. **Deploy MCP Server**: Run the TanStack application
4. **Integrate with Clients**: Connect MCP-aware tools/IDEs to the endpoints
5. **Monitor Transactions**: Use status endpoint to track execution

## Files

- `src/server/mcp-server.ts` - Core MCP tool implementations
- `src/routes/mcp.ts` - Metadata discovery endpoint
- `src/routes/mcp.tools.$toolName.ts` - Tool invocation bridge
- `src/server/providers/fireblocks.ts` - Fireblocks API client
- `src/server/fx-engine.server.ts` - FX quote/transaction logic

## References

- [Fireblocks REST API Docs](https://developers.fireblocks.com/reference/api-overview)
- [Dynamic Labs SDK Docs](https://docs.dynamic.xyz/docs)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
