import { ethers } from 'ethers';

// Treasury private key from .env.local
const PRIVATE_KEY = 'e506a46f81afb1f11a14d80d20651c0823fa25c92697dbcbffbd9ba5cedd6f58';

// RPC URLs
const SEPOLIA_RPC_URLS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
  'https://sepolia.gateway.tenderly.co'
];

async function checkTreasury() {
  try {
    // Create provider
    let provider;
    for (const rpcUrl of SEPOLIA_RPC_URLS) {
      try {
        provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        await provider.getNetwork();
        console.log(`✅ Connected to: ${rpcUrl}\n`);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!provider) {
      console.error('❌ Failed to connect to any RPC');
      return;
    }

    // Create wallet
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Get address
    console.log('📍 Treasury Wallet Address:');
    console.log(wallet.address);
    console.log('');
    
    // Get balance
    const balance = await wallet.getBalance();
    const ethBalance = ethers.utils.formatEther(balance);
    
    console.log('💰 Current Balance:');
    console.log(`${ethBalance} SepoliaETH`);
    console.log('');
    
    // Calculate how many redemptions possible
    const POINTS_TO_ETH_RATE = 0.00001;
    const maxRedemptions = Math.floor(parseFloat(ethBalance) / POINTS_TO_ETH_RATE);
    console.log('📊 Can support approximately:');
    console.log(`${maxRedemptions.toLocaleString()} points worth of redemptions`);
    console.log('');
    
    if (parseFloat(ethBalance) < 0.01) {
      console.log('⚠️  LOW BALANCE! Get testnet ETH from these faucets:');
      console.log('   1. https://sepoliafaucet.com/');
      console.log('   2. https://www.infura.io/faucet/sepolia');
      console.log('   3. https://faucets.chain.link/sepolia');
      console.log('');
      console.log(`   Send to: ${wallet.address}`);
    } else {
      console.log('✅ Treasury has sufficient balance');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTreasury();
