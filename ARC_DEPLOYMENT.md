# Arc Testnet Deployment Guide

This guide covers the configuration and deployment of the Liquira FX system on the Arc Testnet.

## Arc Testnet Configuration

### Network Details
- **Network Name:** Arc Testnet
- **Chain ID:** 5,042,002
- **RPC URL:** https://rpc.testnet.arc.network
- **Block Explorer:** https://testnet.arcscan.app
- **Native Gas Token:** USDC (6 decimals)

### Configured in this project:
- `src/lib/arc-testnet.ts` - Chain definition and contract addresses
- `src/lib/wagmi.ts` - Wagmi configuration with Arc RPC
- `.env` - Arc environment variables

## USDC Contract on Arc

**Contract Address:** `0x3600000000000000000000000000000000000000`

This is Arc's native USDC contract. Key features:
- ERC-20 compatible
- 6 decimal places
- Used as native gas token for transactions
- Directly integrated into Arc's finality mechanism

### ABI Functions

```solidity
// Transfer USDC to a recipient
function transfer(address to, uint256 amount) public returns (bool)

// Check account balance
function balanceOf(address account) public view returns (uint256)
```

Both functions are implemented in `src/lib/arc-testnet.ts` via `ERC20_TRANSFER_ABI`.

## Funding Test Wallets

To test USDC transfers, fund your wallet using one of these faucets:

### 1. **Circle Faucet** (Recommended)
- **URL:** https://faucet.circle.com/
- **Network:** Select "Arc Testnet"
- **Amount:** Varies by faucet (typically 1-100 USDC)
- **Note:** Official Circle developer faucet

### 2. **Arc Community Faucet**
- **URL:** https://easyfaucetarc.xyz/
- **Amount:** Up to 100 USDC/day
- **Note:** Community-maintained faucet

### 3. **Thirdweb Arc Faucet**
- **URL:** https://thirdweb.com/arc-testnet
- **Amount:** 1 USDC/day
- **Note:** Thirdweb-hosted faucet

## Settlement Flow

### Arc Settlement Architecture

```
User FX Request
     ↓
Quote Calculation (src/server/fx-engine.server.ts)
     ↓
Circle Treasury Balance Check (src/server/providers/circle.ts)
     ↓
Transaction Creation (src/server/transaction-service.server.ts)
     ↓
Arc Settlement (src/server/arc-settlement.server.ts)
     ├─ Real Transfer (if ARC_PRIVATE_KEY set & wallet funded)
     │  └─ viem writeContract to USDC.transfer()
     └─ Mock Transfer (fallback for development)
     ↓
Success/Failure Response
```

### Real vs Mock Transfers

**Real Transfer** (when `ARC_PRIVATE_KEY` is set):
```typescript
// Attempts actual USDC transfer via viem
const txHash = await client.writeContract({
  address: "0x3600000000000000000000000000000000000000",
  abi: ERC20_TRANSFER_ABI,
  functionName: "transfer",
  args: [destinationAddress, amountInUnits]
});
```

**Mock Transfer** (fallback):
- Returns deterministic mock hash
- Used when wallet lacks balance or real transfer fails
- Allows development/testing without funded wallets

## Environment Variables

### Required for Arc Transfers
```env
ARC_DESTINATION_ADDRESS=0x8c258e75c0d4b025e211f14a898e350b4d8e69ec
ARC_PRIVATE_KEY=0x...  # Test private key (development only)
```

### Optional for Fireblocks Custody
```env
FIREBLOCKS_API_KEY=your_api_key
FIREBLOCKS_API_SECRET=your_api_secret
FIREBLOCKS_BASE_URL=https://api.fireblocks.io/v1
```

## Verification

### Check Transaction on Arc Explorer
1. Navigate to https://testnet.arcscan.app
2. Paste transaction hash from settlement logs
3. Verify transaction details and status

### Query Contract via Cast (CLI)
```bash
# Check balance
cast call 0x3600000000000000000000000000000000000000 \
  "balanceOf(address)" 0xYourAddress \
  --rpc-url https://rpc.testnet.arc.network

# Check USDC balance in Wei
cast to-unit $(cast call 0x3600000000000000000000000000000000000000 \
  "balanceOf(address)" 0xYourAddress \
  --rpc-url https://rpc.testnet.arc.network) 6
```

## Fireblocks Integration

For production deployments with Fireblocks custody:

1. **Generate Fireblocks API credentials**
   - Create Fireblocks account at https://app.fireblocks.com
   - Generate API key and secret
   - Set in environment variables

2. **Dynamic Wallet Creation** (src/server/providers/fireblocks.ts)
   ```typescript
   const wallet = await createDynamicWallet(userId);
   // Creates individual vault account per user
   ```

3. **Custody-Based Signing** (src/server/fx-engine.server.ts)
   ```typescript
   const txResult = await signAndSendTransaction({
     vaultAccountId,
     destinationAddress,
     amount,
     assetId: "ARC_USDC"
   });
   ```

## Troubleshooting

### "ERC20: transfer amount exceeds balance"
- Fund wallet with USDC from faucets above
- Check balance: `src/server/transaction-service.server.ts` logs wallet balance

### "Arc network check failed"
- Verify RPC URL is accessible: `https://rpc.testnet.arc.network`
- Check network connectivity
- System will fall back to mock transfers

### "Supabase connection test failed"
- Supabase is optional for development
- System uses in-memory storage fallback
- For production, configure Supabase credentials

## Best Practices

1. **Never commit private keys**
   - Use `.env` files (gitignored)
   - Use secrets management in production

2. **Test with small amounts**
   - Arc testnet USDC has no real value
   - Start with 1 USDC transfers

3. **Monitor transaction status**
   - Check Arc Testnet Explorer: https://testnet.arcscan.app
   - Verify receipt status in logs

4. **Use Fireblocks for production**
   - Provides secure custody of keys
   - Enables multi-sig workflows
   - Required for enterprise deployments

## References

- [Arc Network Docs](https://docs.arc.network)
- [Arc RPC Endpoints](https://docs.arc.network/developers/rpc-endpoints)
- [Arc Testnet Explorer](https://testnet.arcscan.app)
- [Circle Developer Docs](https://developers.circle.com)
- [Fireblocks API Reference](https://developers.fireblocks.com)
