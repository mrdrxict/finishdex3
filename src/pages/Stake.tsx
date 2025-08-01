import React, { useState, useEffect } from 'react'
import { Lock, Gift, TrendingUp, Users, DollarSign } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { useStakingContract } from '../hooks/useStakingContract'
import TestnetBadge from '../components/TestnetBadge'

interface StakeProps {
  testnetMode?: boolean;
}

const Stake: React.FC<StakeProps> = () => {
  const { isConnected, account } = useWallet()
  const { 
    stakeESR, 
    unstakeESR, 
    claimAllRewards,
    getStakeInfo, 
    getStakingStats,
    checkFeeRequirements,
    distributeRewards
  } = useStakingContract()
  
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [isStaking, setIsStaking] = useState(false)
  const [isUnstaking, setIsUnstaking] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [isDistributing, setIsDistributing] = useState(false)
  
  const [userStake, setUserStake] = useState<{
    amount: string;
    stakedAt: number;
    lockEndsAt: number;
    canUnstake: boolean;
    pendingRewards: string;
  }>({
    amount: '0',
    stakedAt: 0,
    lockEndsAt: 0,
    canUnstake: false,
    pendingRewards: '0'
  })
  
  const [stakingStats, setStakingStats] = useState<{
    totalStaked: string;
    totalStakers: number;
    totalRewardsDistributed: string;
    pendingRewards: string;
    currentAPR: string;
    lastDistribution: number;
  }>({
    totalStaked: '0',
    totalStakers: 0,
    totalRewardsDistributed: '0',
    pendingRewards: '0',
    currentAPR: '0',
    lastDistribution: 0
  })

  const [feeStatus, setFeeStatus] = useState<{
    hasBalance: boolean;
    hasAllowance: boolean;
    balance: string;
    allowance: string;
  }>({
    hasBalance: false,
    hasAllowance: false,
    balance: '0',
    allowance: '0'
  })

  useEffect(() => {
    if (account) {
      loadStakeInfo()
      loadStakingStats()
      checkFeeStatus()
    }
  }, [account])

  // Refresh data periodically
  useEffect(() => {
    if (account) {
      const intervalId = setInterval(() => {
        loadStakeInfo();
        loadStakingStats();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [account]);

  const loadStakeInfo = async () => {
    try {
      if (!account) return

      const info = await getStakeInfo(account).catch((err: any) => {
        console.warn('Could not load stake info, using defaults', err);
        return {
          amount: '0',
          stakedAt: 0,
          lockEndsAt: 0,
          canUnstake: false,
          pendingRewards: '0'
        };
      });
      
      setUserStake(info)
    } catch (error) {
      console.error('Error loading stake info:', error)
    }
  }

  const loadStakingStats = async () => {
    try {
      const stats = await getStakingStats().catch((err: any) => {
        console.warn('Could not load staking stats, using defaults', err);
        return {
          totalStaked: '0',
          totalStakers: 0,
          totalRewardsDistributed: '0',
          pendingRewards: '0',
          currentAPR: '0',
          lastDistribution: 0
        };
      });
      
      setStakingStats(stats)
    } catch (error) {
      console.error('Error loading staking stats:', error)
    }
  }

  const checkFeeStatus = async () => {
    try {
      if (account) {
        const status = await checkFeeRequirements(account).catch(() => ({ hasBalance: false, hasAllowance: false, balance: '0', allowance: '0' }));
        setFeeStatus(status)
      }
    } catch (error) {
      console.error('Error checking fee status:', error)
      setFeeStatus({
        hasBalance: false,
        hasAllowance: false,
        balance: '0',
        allowance: '0'
      })
    }
  }

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) < 100) {
      alert('Minimum stake is 100 ESR')
      return;
    }

    try {
      setIsStaking(true)
      await stakeESR(stakeAmount).catch(error => {
        console.error('Staking error:', error)
        throw new Error('Failed to stake ESR')
      });
      alert('ESR staked successfully!')
      setStakeAmount('')
      loadStakeInfo()
      loadStakingStats()
    } catch (error) {
      console.error('Staking failed:', error)
      alert('Staking failed. Please try again.')
    } finally {
      setIsStaking(false)
    }
  }

  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      alert('Please enter a valid amount')
      return;
    }

    if (!userStake.canUnstake) {
      alert('Stake is still locked or you have no active stake')
      return;
    }

    try {
      setIsUnstaking(true)
      await unstakeESR(unstakeAmount).catch(error => {
        console.error('Unstaking error:', error)
        throw new Error('Failed to unstake ESR')
      });
      alert('ESR unstaked successfully!')
      setUnstakeAmount('')
      loadStakeInfo()
      loadStakingStats()
    } catch (error) {
      console.error('Unstaking failed:', error)
      alert('Unstaking failed. Please try again.')
    } finally {
      setIsUnstaking(false)
    }
  }

  const handleClaimRewards = async () => {
    try {
      setIsClaiming(true)
      await claimAllRewards().catch(error => {
        console.error('Claiming error:', error)
        throw new Error('Failed to claim rewards')
      });
      alert('Rewards claimed successfully!')
      loadStakeInfo()
    } catch (error) {
      console.error('Claiming failed:', error)
      alert('Claiming failed. Please try again.')
    } finally {
      setIsClaiming(false)
    }
  }

  const formatTime = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return 'N/A'
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const formatTimeRemaining = (lockEndsAt: number) => {
    if (!lockEndsAt || lockEndsAt === 0) return 'N/A'
    const now = Date.now() / 1000
    const remaining = lockEndsAt - now
    if (remaining <= 0) return 'Unlocked'
    
    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)
    return `${days}d ${hours}h`
  }

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return 'Never'
    const seconds = Math.floor(Date.now() / 1000) - timestamp;
    return seconds < 60 ? 'Just now' : seconds < 3600 ? `${Math.floor(seconds / 60)}m ago` : seconds < 86400 ? `${Math.floor(seconds / 3600)}h ago` : `${Math.floor(seconds / 86400)}d ago`
  }

  const handleDistributeRewards = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      setIsDistributing(true);
      await distributeRewards().catch((error: any) => {
        console.error('Distribution error:', error);
        throw new Error('Failed to distribute rewards');
      });
      alert('Rewards distributed successfully!');
      loadStakingStats();
    } catch (error) {
      console.error('Distribution failed:', error);
      alert('Distribution failed. Please try again.');
    } finally {
      setIsDistributing(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-12 text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Connect your wallet to start staking ESR and earning USDT rewards.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold">ESR Staking</h1>
          <TestnetBadge className="ml-2" />
        </div>
        <div className="card p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending Rewards</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${parseFloat(userStake.pendingRewards || '0').toFixed(2)} USDT
            </p>
          </div>
        </div>
      </div>

      {/* Admin Controls - Only show for admin/owner */}
      {isConnected && account === '0x...' && (
        <div className="card p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Admin Controls</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last distribution: {formatTimeAgo(stakingStats?.lastDistribution || 0)}</p>
            </div>
            <button onClick={handleDistributeRewards} disabled={isDistributing || stakingStats?.pendingRewards === '0'} 
              className="btn-primary">{isDistributing ? 'Distributing...' : 'Distribute Rewards'}</button>
          </div>
        </div>
      )}
      {/* Fee Status Warning */}
      {(!feeStatus.hasBalance || !feeStatus.hasAllowance) && (
        <div className="card p-4 mb-6 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
            <DollarSign className="w-5 h-5" />
            <div>
              <p className="font-medium">USDT Fee Required</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You need $3 USDT balance and approval for swap/bridge fees. 
                Balance: ${(parseFloat(feeStatus.balance) / 1e6).toFixed(2)} | 
                Allowance: ${(parseFloat(feeStatus?.allowance || '0') / 1e6).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {parseFloat(stakingStats?.currentAPR || '0').toFixed(1)}%
            </span>
          </div>
          <h3 className="font-semibold">Current APR</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Annual Percentage Rate</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span className="text-2xl font-bold">
              {parseFloat(stakingStats?.totalStaked || '0').toLocaleString()}
            </span>
          </div>
          <h3 className="font-semibold">Total Staked</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">ESR Tokens</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <span className="text-2xl font-bold">{stakingStats?.totalStakers || 0}</span>
          </div>
          <h3 className="font-semibold">Total Stakers</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Participants</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <Gift className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <span className="text-2xl font-bold">
              ${parseFloat(stakingStats?.totalRewardsDistributed || '0').toFixed(0)}
            </span>
          </div>
          <h3 className="font-semibold">Total Rewards</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">USDT Distributed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Staking */}
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-6">Stake ESR Tokens</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount to Stake (Minimum: 100 ESR)
              </label>
              <input
                type="number"
                placeholder="100"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="input-field"
                min="100"
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Staking Terms</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Minimum stake: 100 ESR</li>
                <li>• Lock period: 7 days</li>
                <li>• Rewards: USDT from $3 fees</li>
                <li>• Proportional to your stake weight</li>
              </ul>
            </div>

            <button
              onClick={handleStake}
              disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) < 100}
              className="w-full btn-primary py-3"
            >
              {isStaking ? 'Staking...' : 'Stake ESR'}
            </button>
          </div>
        </div>

        {/* Right Panel: User Stake Info */}
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-6">Your Stake</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Staked Amount</p>
                <p className="text-lg font-semibold">{parseFloat(userStake.amount || '0').toLocaleString()} ESR</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Staked Date</p>
                <p className="text-lg font-semibold">{userStake.stakedAt ? formatTime(userStake.stakedAt) : 'Not staked'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Lock Status</p>
                <p className={`text-lg font-semibold ${userStake?.canUnstake ? 'text-green-600' : 'text-orange-600'}`}>
                  {userStake?.canUnstake ? 'Unlocked' : formatTimeRemaining(userStake?.lockEndsAt || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Rewards</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400 truncate">
                  ${parseFloat(userStake.pendingRewards || '0').toFixed(2)}
                </p>
              </div>
            </div>

            {parseFloat(userStake.pendingRewards || '0') > 0 && (
              <button
                onClick={handleClaimRewards}
                disabled={isClaiming}
                className="w-full btn-primary py-3"
              >
                {isClaiming ? 'Claiming...' : 'Claim All Rewards'}
              </button>
            )}

            {parseFloat(userStake.amount || '0') > 0 && userStake.canUnstake && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount to Unstake
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    className="input-field"
                    max={userStake.amount}
                  />
                </div>
                <button
                  onClick={handleUnstake}
                  disabled={isUnstaking || !userStake.canUnstake || !unstakeAmount}
                  className="w-full btn-secondary py-3"
                >
                  {isUnstaking ? 'Unstaking...' : 'Unstake ESR'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="card p-6 mt-6 overflow-hidden">
        <h3 className="text-xl font-semibold mb-4">How ESR Staking Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-semibold mb-2">1. Stake ESR</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 px-2">
              Stake minimum 100 ESR tokens with a 7-day lock period to become eligible for rewards.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="font-semibold mb-2">2. Fees Collected</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 px-2">
              Every swap and bridge transaction pays a $3 USDT fee that goes into the reward pool.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <Gift className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="font-semibold mb-2">3. Earn Rewards</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 px-2">
              Rewards are distributed proportionally to your stake weight. Claim anytime!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Stake
