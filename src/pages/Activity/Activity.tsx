import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useConnectWallet } from "@web3-onboard/react";
import { useActivityState, useAppDispatch } from "../../store/hooks";
import TransactionCard from "./components/TransactionCard";
import { fetchUserTransactions } from "../../store/activitySlice";
import { fetchTokenPairs, BridgeTransaction } from "../../store/bridgeSlice";

const Activity: React.FC = () => {
  const [{ wallet }] = useConnectWallet();
  const dispatch = useAppDispatch();
  const [refreshKey, setRefreshKey] = useState(0);

  const userAddress = wallet?.accounts?.[0]?.address;
  const { transactions, loading, error } = useActivityState();

  useEffect(() => {
    if (userAddress) {
      dispatch(fetchUserTransactions(userAddress));
    }
  }, [userAddress, refreshKey, dispatch]);

  useEffect(() => {
    dispatch(fetchTokenPairs());
  }, [dispatch]);

  const handleRefresh = () => {
    if (userAddress) {
      dispatch(fetchUserTransactions(userAddress));
      setRefreshKey((key) => key + 1);
    }
  };

  const { executedCount, pendingCount } = useMemo(() => {
    const executed = transactions.filter((tx: BridgeTransaction) => tx.status === "executed").length;
    const pending = transactions.filter((tx: BridgeTransaction) => tx.status === "pending").length;
    return { executedCount: executed, pendingCount: pending };
  }, [transactions]);

  if (!wallet) {
    return (
      <div className="min-h-screen bg-bg-page text-text">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-bg-surface p-12 text-center shadow-floating"
          >
            <h1 className="text-3xl font-semibold">Bridge Activity</h1>
            <p className="mt-3 text-text-muted">
              Connect your wallet to view your bridge transaction history.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-page text-text">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-semibold">Bridge Activity</h1>
              <p className="mt-2 text-text-muted">Track your bridge transactions across networks.</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={loading}
              className="rounded-lg border border-primary bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-text-muted"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Refreshing…</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Refresh</span>
                </div>
              )}
            </motion.button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-bg-surface p-6 shadow-sm"
            >
              <p className="text-sm text-text-muted">Total Transactions</p>
              <p className="mt-2 text-2xl font-semibold">{transactions.length}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border bg-bg-surface p-6 shadow-sm"
            >
              <p className="text-sm text-text-muted">Completed</p>
              <p className="mt-2 text-2xl font-semibold text-success">{executedCount}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-border bg-bg-surface p-6 shadow-sm"
            >
              <p className="text-sm text-text-muted">Pending</p>
              <p className="mt-2 text-2xl font-semibold text-warning">{pendingCount}</p>
            </motion.div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-sm">
            <div className="border-b border-border p-6">
              <h2 className="text-xl font-semibold">Recent Transactions</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-text-muted">Loading transactions…</p>
              </div>
            ) : error ? (
              <div className="space-y-4 p-8 text-center">
                <p className="text-danger">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
                >
                  Try Again
                </button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-text-muted">No transactions found.</p>
                <p className="mt-1 text-sm text-text-muted">
                  Your bridge history will appear here once you submit a transfer.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((transaction: BridgeTransaction, index: number) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <TransactionCard transaction={transaction} onRefresh={handleRefresh} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm text-text-muted">
              Transactions refresh automatically. Use the refresh button to force an update.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Activity;


