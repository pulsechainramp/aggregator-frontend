import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useConnectWallet } from '@web3-onboard/react';
import { useAppSelector, useAppDispatch, useActivityState } from '../../store/hooks';
import TransactionCard from './components/TransactionCard';
import { fetchUserTransactions } from '../../store/activitySlice';
import { fetchTokenPairs } from '../../store/bridgeSlice';
import { BridgeTransaction } from '../../store/bridgeSlice';

const Activity: React.FC = () => {
  const [{ wallet }] = useConnectWallet();
  const dispatch = useAppDispatch();
  const [refreshKey, setRefreshKey] = useState(0);

  const userAddress = wallet?.accounts?.[0]?.address;
  
  // Get state from Redux using custom selectors
  const { transactions, loading, error } = useActivityState();

  // Fetch transactions when wallet connects or refresh is triggered
  useEffect(() => {
    if (userAddress) {
      dispatch(fetchUserTransactions(userAddress));
    }
  }, [userAddress, refreshKey, dispatch]);

  // Fetch token pairs when component mounts to ensure token information is available
  useEffect(() => {
    dispatch(fetchTokenPairs());
  }, [dispatch]);

  const handleRefresh = () => {
    if (userAddress) {
      dispatch(fetchUserTransactions(userAddress));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e] text-white">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold mb-4">Bridge Activity</h1>
            <p className="text-gray-400 mb-8">Connect your wallet to view your bridge transaction history</p>
            <div className="bg-[#1e2030] rounded-xl p-8 border border-[#3a3f5a]">
              <div className="text-6xl mb-4">🔗</div>
              <p className="text-gray-300">Please connect your wallet to continue</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e] text-white">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Bridge Activity</h1>
              <p className="text-gray-400">
                Track your bridge transactions across networks
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={loading}
              className="mt-4 sm:mt-0 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Refreshing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </div>
              )}
            </motion.button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1e2030] rounded-xl p-6 border border-[#3a3f5a] hover:border-[#4a4f6a] transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Transactions</p>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1e2030] rounded-xl p-6 border border-[#3a3f5a] hover:border-[#4a4f6a] transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-green-400">
                    {transactions.filter((tx: BridgeTransaction) => tx.status === 'executed').length}
                  </p>
                </div>
                <div className="text-3xl">✅</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1e2030] rounded-xl p-6 border border-[#3a3f5a] hover:border-[#4a4f6a] transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {transactions.filter((tx: BridgeTransaction) => tx.status === 'pending').length}
                  </p>
                </div>
                <div className="text-3xl">⏳</div>
              </div>
            </motion.div>
          </div>

          {/* Transactions List */}
          <div className="bg-[#1e2030] rounded-xl border border-[#3a3f5a] overflow-hidden">
            <div className="p-6 border-b border-[#3a3f5a]">
              <h2 className="text-xl font-semibold">Recent Transactions</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading transactions...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="text-red-400 text-6xl mb-4">⚠️</div>
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">📭</div>
                <p className="text-gray-400 mb-2">No transactions found</p>
                <p className="text-gray-500 text-sm">Your bridge transaction history will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-[#3a3f5a]">
                {transactions.map((transaction: BridgeTransaction, index: number) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <TransactionCard 
                      transaction={transaction}
                      onRefresh={handleRefresh}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Auto-refresh info */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              💡 Transactions are automatically updated. Click refresh to check for new updates.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Activity; 