# Blockchain Token Redemption Setup Guide

This guide will help you set up the blockchain token redemption feature for your waste management rewards system.

## Overview

Users can now redeem their earned points for **Sepolia testnet ETH tokens**. This implementation uses:
- **Network**: Ethereum Sepolia Testnet
- **Technology**: ethers.js v5
- **Conversion Rate**: 1 point = 0.00001 SepoliaETH

## Setup Instructions

### 1. Create a Treasury Wallet

The treasury wallet is used to distribute tokens to users when they redeem points.

**Option A: Using MetaMask (Recommended)**
1. Install [MetaMask](https://metamask.io/) browser extension
2. Create a new wallet or import an existing one
3. Switch network to "Sepolia Test Network"
   - Click the network dropdown at the top
   - Select "Show test networks" in settings if needed
   - Select "Sepolia"
4. Export your private key:
   - Click the three dots → Account Details → Export Private Key
   - Enter your password
   - **⚠️ NEVER share this key or commit it to GitHub!**

**Option B: Create programmatically**
```bash
# Install ethers globally
npm install -g ethers

# Create a new wallet (run in terminal)
node -e "const ethers = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

### 2. Fund the Treasury Wallet

Get free Sepolia testnet ETH from faucets:

**Recommended Faucets:**
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/) - 0.5 ETH/day
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- [Chainlink Faucet](https://faucets.chain.link/sepolia) - Requires 0.001 ETH on mainnet

**Steps:**
1. Copy your treasury wallet address
2. Visit one of the faucets above
3. Paste your address and request testnet ETH
4. Wait for confirmation (usually 1-2 minutes)

**How much do you need?**
- Minimum: 0.1 SepoliaETH (supports ~10,000 point redemptions)
- Recommended: 0.5 SepoliaETH for testing

### 3. Configure Environment Variable

Add your treasury private key to `.env.local`:

```bash
NEXT_PUBLIC_TREASURY_PRIVATE_KEY=0x1234567890abcdef... # Your actual private key
```

**Security Note:**
- ⚠️ This is a **testnet** key only - never use mainnet keys
- Add `.env.local` to `.gitignore` (already done)
- Consider using separate wallets for development/production

### 4. Restart Development Server

After adding the environment variable:

```bash
npm run dev
```

## How It Works

### For Users
1. Earn points by reporting/collecting waste
2. Navigate to the Rewards page
3. Enter their Ethereum wallet address (0x...)
4. Click "Redeem to Blockchain"
5. Points are converted to SepoliaETH and sent to their wallet
6. Transaction is recorded in the database
7. User receives transaction hash for verification

### Conversion Rates

Current rate: **1 point = 0.00001 SepoliaETH**

Examples:
- 100 points → 0.001 SepoliaETH
- 1,000 points → 0.01 SepoliaETH
- 10,000 points → 0.1 SepoliaETH

You can adjust the rate in `src/lib/blockchain.ts`:
```typescript
const POINTS_TO_ETH_RATE = 0.00001; // Modify this value
```

## Testing the Feature

### Test Flow

1. **Log in** to your app
2. **Earn some points** by reporting/collecting waste
3. **Get a test wallet address**:
   - Use your MetaMask address, OR
   - Use a test address generator: [Vanity-ETH](https://vanity-eth.tk/)
4. **Navigate to Rewards page**
5. **Enter wallet address** in the blockchain redemption section
6. **Click "Redeem to Blockchain"**
7. **Check transaction** on [Sepolia Etherscan](https://sepolia.etherscan.io/)

### Verify Transaction

After redemption, you'll see:
- Success toast with transaction hash
- "View on Etherscan" link
- Transaction recorded in Recent Transactions

Click the Etherscan link to verify:
- Transaction status
- From/To addresses
- Amount transferred
- Gas used

## Troubleshooting

### "Treasury wallet not configured"
- Ensure `NEXT_PUBLIC_TREASURY_PRIVATE_KEY` is set in `.env.local`
- Restart your dev server

### "Insufficient treasury funds"
- Check treasury balance on [Sepolia Etherscan](https://sepolia.etherscan.io/)
- Request more testnet ETH from faucets

### "Invalid wallet address format"
- Ensure address starts with `0x`
- Must be 42 characters total
- Example: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

### Transaction fails
- Check Sepolia network status
- Verify treasury has enough gas (ETH)
- Check transaction on Etherscan for details

## Network Information

- **Network Name**: Sepolia
- **Chain ID**: 11155111
- **RPC URL**: https://rpc.ankr.com/eth_sepolia
- **Explorer**: https://sepolia.etherscan.io/
- **Symbol**: SepoliaETH

## Security Best Practices

1. ✅ **Use testnet only** - Never use real mainnet private keys
2. ✅ **Keep private keys secret** - Don't commit to version control
3. ✅ **Monitor treasury balance** - Set up alerts if needed
4. ✅ **Regular audits** - Check transaction history periodically
5. ✅ **Limit treasury funds** - Only keep what's needed for testing

## Future Enhancements

Possible improvements:
- Add support for mainnet (with proper security)
- Implement ERC-20 token redemptions
- Add multi-chain support (Polygon, BSC, etc.)
- Implement automatic treasury refill
- Add transaction fee calculations
- Support for gasless transactions (meta-transactions)

## Support

For issues or questions:
1. Check transaction on Sepolia Etherscan
2. Review console logs for error messages
3. Verify environment variables are set correctly
4. Ensure treasury wallet has sufficient balance

---

**Important Reminder**: This implementation uses **testnet tokens** which have no real monetary value. They are only for testing purposes.
