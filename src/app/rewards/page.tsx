'use client'
import { useState, useEffect } from 'react'
import { Coins, ArrowUpRight, ArrowDownRight, Gift, AlertCircle, Loader, Wallet, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getUserByEmail, getRewardTransactions, getAvailableRewards, redeemReward, createTransaction } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'
import { sendTestnetTokens, getTransactionUrl, isValidWalletAddress, calculateEthAmount } from '@/lib/blockchain'

type Transaction = {
  id: number
  type: 'earned_report' | 'earned_collect' | 'redeemed'
  amount: number
  description: string
  date: string
}

type Reward = {
  id: number
  name: string
  cost: number
  description: string | null
  collectionInfo: string
}

export default function RewardsPage() {
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserDataAndRewards = async () => {
      setLoading(true)
      try {
        const userEmail = localStorage.getItem('userEmail')
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail)
          if (fetchedUser) {
            setUser(fetchedUser)
            const fetchedTransactions = await getRewardTransactions(fetchedUser.id)
            setTransactions(fetchedTransactions as Transaction[])
            const fetchedRewards = await getAvailableRewards(fetchedUser.id)
            setRewards(fetchedRewards.filter(r => r.cost > 0)) // Filter out rewards with 0 points
            const calculatedBalance = fetchedTransactions.reduce((acc, transaction) => {
              return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
            }, 0)
            setBalance(Math.max(calculatedBalance, 0)) // Ensure balance is never negative
          } else {
            toast.error('User not found. Please log in again.')
          }
        } else {
          toast.error('User not logged in. Please log in.')
        }
      } catch (error) {
        console.error('Error fetching user data and rewards:', error)
        toast.error('Failed to load rewards data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchUserDataAndRewards()
  }, [])

  const handleRedeemReward = async (rewardId: number) => {
    if (!user) {
      toast.error('Please log in to redeem rewards.')
      return
    }

    const reward = rewards.find(r => r.id === rewardId)
    if (reward && balance >= reward.cost && reward.cost > 0) {
      try {
        if (balance < reward.cost) {
          toast.error('Insufficient balance to redeem this reward')
          return
        }

        // Update database
        await redeemReward(user.id, rewardId);
        
        // Create a new transaction record
        await createTransaction(user.id, 'redeemed', reward.cost, `Redeemed ${reward.name}`);

        // Refresh user data and rewards after redemption
        await refreshUserData();

        toast.success(`You have successfully redeemed: ${reward.name}`)
      } catch (error) {
        console.error('Error redeeming reward:', error)
        toast.error('Failed to redeem reward. Please try again.')
      }
    } else {
      toast.error('Insufficient balance or invalid reward cost')
    }
  }

  const handleRedeemAllPoints = async () => {
    if (!user) {
      toast.error('Please log in to redeem points.');
      return;
    }

    if (balance > 0) {
      try {
        // Update database
        await redeemReward(user.id, 0);
        
        // Create a new transaction record
        await createTransaction(user.id, 'redeemed', balance, 'Redeemed all points');

        // Refresh user data and rewards after redemption
        await refreshUserData();

        toast.success(`You have successfully redeemed all your points!`);
      } catch (error) {
        console.error('Error redeeming all points:', error);
        toast.error('Failed to redeem all points. Please try again.');
      }
    } else {
      toast.error('No points available to redeem')
    }
  }

  const handleBlockchainRedemption = async () => {
    if (!user) {
      toast.error('Please log in to redeem tokens.');
      return;
    }

    if (!walletAddress.trim()) {
      toast.error('Please enter your wallet address');
      return;
    }

    if (!isValidWalletAddress(walletAddress)) {
      toast.error('Invalid wallet address format');
      return;
    }

    if (balance <= 0) {
      toast.error('Insufficient points to redeem');
      return;
    }

    setRedeeming(true);
    const toastId = toast.loading('Sending tokens to your wallet...');

    try {
      // Send tokens via blockchain
      const result = await sendTestnetTokens(walletAddress, balance);

      if (result.success && result.txHash) {
        // Update database - redeem points
        await redeemReward(user.id, 0);
        
        // Create transaction record
        await createTransaction(
          user.id,
          'redeemed',
          balance,
          `Redeemed ${balance} points for ${result.amountSent} (Tx: ${result.txHash.substring(0, 10)}...)`
        );

        // Store transaction hash
        setLastTxHash(result.txHash);

        // Refresh user data
        await refreshUserData();

        toast.success(
          <div>
            <p>Successfully sent {result.amountSent} to your wallet!</p>
            <a 
              href={getTransactionUrl(result.txHash)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 underline text-sm"
            >
              View on Etherscan
            </a>
          </div>,
          { id: toastId, duration: 10000 }
        );

        // Clear wallet address
        setWalletAddress('');
      } else {
        toast.error(result.error || 'Failed to send tokens', { id: toastId });
      }
    } catch (error: any) {
      console.error('Blockchain redemption error:', error);
      toast.error('Transaction failed. Please try again.', { id: toastId });
    } finally {
      setRedeeming(false);
    }
  }

  const refreshUserData = async () => {
    if (user) {
      const fetchedUser = await getUserByEmail(user.email);
      if (fetchedUser) {
        const fetchedTransactions = await getRewardTransactions(fetchedUser.id);
        setTransactions(fetchedTransactions as Transaction[]);
        const fetchedRewards = await getAvailableRewards(fetchedUser.id);
        setRewards(fetchedRewards.filter(r => r.cost > 0)); // Filter out rewards with 0 points
        
        // Recalculate balance
        const calculatedBalance = fetchedTransactions.reduce((acc, transaction) => {
          return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
        }, 0)
        setBalance(Math.max(calculatedBalance, 0)) // Ensure balance is never negative
      }
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <Loader className="animate-spin h-8 w-8 text-gray-600" />
    </div>
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6 text-gray-800">Rewards</h1>
      
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg flex flex-col justify-between h-full border-l-4 border-green-500 mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">Reward Balance</h2>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center">
            <Coins className="w-8 h-8 sm:w-10 sm:h-10 mr-2 sm:mr-3 text-green-500 shrink-0" />
            <div>
              <span className="text-3xl sm:text-4xl font-bold text-green-500">{balance}</span>
              <p className="text-xs sm:text-sm text-gray-500">Available Points</p>
              {balance > 0 && (
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">≈ {calculateEthAmount(balance)} SepoliaETH</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Redemption Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 sm:p-6 rounded-xl shadow-lg mb-6 sm:mb-8 border border-purple-200">
        <div className="flex items-center mb-3 sm:mb-4">
          <Wallet className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600 shrink-0" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Redeem to Blockchain</h2>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
          Convert your points to Sepolia testnet ETH tokens. Enter your wallet address below.
        </p>
        <div className="space-y-2 sm:space-y-3">
          <input
            type="text"
            placeholder="Your Ethereum wallet address (0x...)" 
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={redeeming || balance === 0}
          />
          <Button
            onClick={handleBlockchainRedemption}
            disabled={redeeming || balance === 0 || !walletAddress.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-sm sm:text-base py-2.5 sm:py-3"
          >
            {redeeming ? (
              <>
                <Loader className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                <span className="text-xs sm:text-sm">Processing...</span>
              </>
            ) : (
              <>
                <Wallet className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                <span className="text-xs sm:text-sm">Redeem {balance} Points ({calculateEthAmount(balance)} SepoliaETH)</span>
              </>
            )}
          </Button>
          {lastTxHash && (
            <a
              href={getTransactionUrl(lastTxHash)}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center text-xs sm:text-sm text-purple-600 hover:text-purple-700"
            >
              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              View Last Transaction
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-800">Recent Transactions</h2>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {transactions.length > 0 ? (
              transactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center min-w-0 flex-1">
                    {transaction.type === 'earned_report' ? (
                      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 sm:mr-3 shrink-0" />
                    ) : transaction.type === 'earned_collect' ? (
                      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mr-2 sm:mr-3 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2 sm:mr-3 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base text-gray-800 truncate">{transaction.description}</p>
                      <p className="text-xs sm:text-sm text-gray-500">{transaction.date}</p>
                    </div>
                  </div>
                  <span className={`font-semibold text-sm sm:text-base shrink-0 ml-2 ${transaction.type.startsWith('earned') ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.type.startsWith('earned') ? '+' : '-'}{transaction.amount}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 sm:p-4 text-center text-sm sm:text-base text-gray-500">No transactions yet</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-800">Available Rewards</h2>
          <div className="space-y-3 sm:space-y-4">
            {rewards.length > 0 ? (
              rewards.map(reward => (
                <div key={reward.id} className="bg-white p-3 sm:p-4 rounded-xl shadow-md">
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{reward.name}</h3>
                    <span className="text-green-500 font-semibold text-sm sm:text-base shrink-0">{reward.cost} pts</span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 mb-2">{reward.description}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">{reward.collectionInfo}</p>
                  {reward.id === 0 ? (
                    <div className="space-y-2">
                      <Button 
                        onClick={handleRedeemAllPoints}
                        className="w-full bg-green-500 hover:bg-green-600 text-white text-sm sm:text-base py-2 sm:py-2.5"
                        disabled={balance === 0}
                      >
                        <Gift className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                        Redeem All Points
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => handleRedeemReward(reward.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white text-sm sm:text-base py-2 sm:py-2.5"
                      disabled={balance < reward.cost}
                    >
                      <Gift className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      Redeem Reward
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 mr-2 sm:mr-3 shrink-0" />
                  <p className="text-yellow-700 text-sm sm:text-base">No rewards available at the moment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}