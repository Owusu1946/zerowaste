import { ethers } from 'ethers';

// Sepolia testnet configuration with multiple RPC fallbacks
const SEPOLIA_RPC_URLS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
  'https://sepolia.gateway.tenderly.co',
  'https://rpc.ankr.com/eth_sepolia',
  'https://ethereum-sepolia.blockpi.network/v1/rpc/public'
];
const SEPOLIA_CHAIN_ID = 11155111;

// Conversion rate: 100 points = 0.001 ETH (adjustable)
const POINTS_TO_ETH_RATE = 0.00001; // 1 point = 0.00001 ETH

/**
 * Create a provider with fallback support
 */
async function createProvider(): Promise<ethers.providers.JsonRpcProvider> {
  for (const rpcUrl of SEPOLIA_RPC_URLS) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, {
        chainId: SEPOLIA_CHAIN_ID,
        name: 'sepolia'
      });
      
      // Test the connection
      await provider.getNetwork();
      console.log(`[Blockchain] Connected to RPC: ${rpcUrl}`);
      return provider;
    } catch (error) {
      console.warn(`[Blockchain] Failed to connect to ${rpcUrl}, trying next...`);
      continue;
    }
  }
  
  throw new Error('All RPC providers failed. Please check your internet connection.');
}

export interface TokenTransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
  amountSent?: string;
}

/**
 * Send testnet tokens from treasury wallet to user wallet
 */
export async function sendTestnetTokens(
  recipientAddress: string,
  pointsAmount: number
): Promise<TokenTransferResult> {
  try {
    // Validate recipient address
    if (!ethers.utils.isAddress(recipientAddress)) {
      return {
        success: false,
        error: 'Invalid wallet address format'
      };
    }

    // Get treasury wallet private key from env
    const treasuryPrivateKey = process.env.NEXT_PUBLIC_TREASURY_PRIVATE_KEY;
    if (!treasuryPrivateKey) {
      return {
        success: false,
        error: 'Treasury wallet not configured. Please contact administrator.'
      };
    }

    // Connect to Sepolia testnet with fallback support
    const provider = await createProvider();

    // Create wallet from private key
    const treasuryWallet = new ethers.Wallet(treasuryPrivateKey, provider);

    // Calculate ETH amount from points
    const ethAmount = pointsAmount * POINTS_TO_ETH_RATE;
    const weiAmount = ethers.utils.parseEther(ethAmount.toString());

    // Check treasury balance
    const balance = await treasuryWallet.getBalance();
    if (balance.lt(weiAmount)) {
      return {
        success: false,
        error: 'Insufficient treasury funds. Please contact administrator.'
      };
    }

    // Send transaction
    const tx = await treasuryWallet.sendTransaction({
      to: recipientAddress,
      value: weiAmount,
      gasLimit: 21000 // Standard ETH transfer
    });

    console.log(`[Blockchain] Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait(1);
    
    if (receipt.status === 1) {
      return {
        success: true,
        txHash: tx.hash,
        amountSent: `${ethAmount} SepoliaETH`
      };
    } else {
      return {
        success: false,
        error: 'Transaction failed on blockchain'
      };
    }
  } catch (error: any) {
    console.error('[Blockchain] Error sending tokens:', error);
    
    // Handle common errors
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return {
        success: false,
        error: 'Insufficient funds in treasury wallet'
      };
    } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('RPC providers failed')) {
      return {
        success: false,
        error: 'Unable to connect to Sepolia network. Please try again in a moment.'
      };
    } else if (error.code === 'TIMEOUT') {
      return {
        success: false,
        error: 'Request timeout. Please check your connection and try again.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send tokens'
    };
  }
}

/**
 * Get Sepolia testnet explorer URL for transaction
 */
export function getTransactionUrl(txHash: string): string {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

/**
 * Validate wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  return ethers.utils.isAddress(address);
}

/**
 * Calculate how much ETH user will receive for their points
 */
export function calculateEthAmount(points: number): string {
  const ethAmount = points * POINTS_TO_ETH_RATE;
  return ethAmount.toFixed(6);
}
