import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import useWallet from "../../hooks/useWallet";
import {
  useAppDispatch,
  useReferralCode,
  useReferralFees,
  useReferralLoading,
  useReferralError,
  useReferralClaiming,
} from "../../store/hooks";
import {
  fetchReferralFees,
  claimReferralEarnings,
  ReferralFee,
} from "../../store/referralSlice";
import { getAvailableTokensFromChain } from "../../store/swapSlice";
import { toast } from "react-toastify";
import { TokenType } from "../../types/Swap";

const Referrals: React.FC = () => {
  const { account } = useWallet();
  const dispatch = useAppDispatch();
  const referralCode = useReferralCode();
  const referralFees = useReferralFees();
  const loading = useReferralLoading();
  const error = useReferralError();
  const [tokens, setTokens] = useState<TokenType[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const claiming = useReferralClaiming();

  // Calculate total earnings from Redux state
  const totalEarnings = useMemo(() => {
    return referralFees
      .reduce((sum: number, fee: any) => {
        return sum + parseFloat(fee.amount || "0");
      }, 0)
      .toString();
  }, [referralFees]);

  // Fetch tokens for metadata
  const fetchTokens = async () => {
    setTokensLoading(true);
    try {
      const pulsechainChain = {
        blockchainNetwork: "pulsechain",
        address: "0x0000000000000000000000000000000000000000",
        name: "PulseChain",
        symbol: "PLS",
        decimals: 18,
        image: "",
      } as TokenType;

      const tokensData = await dispatch(
        getAvailableTokensFromChain(pulsechainChain)
      ).unwrap();
      setTokens(tokensData);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setTokensLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      dispatch(fetchReferralFees(account));
      fetchTokens();
    }
  }, [account, dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any errors when component unmounts
      if (error) {
        // You can dispatch a clear error action here if you have one
      }
    };
  }, [error]);

  const handleClaim = async (fee: ReferralFee) => {
    try {
      if (!account) {
        toast.error("Please connect your wallet");
        return;
      }

      // Dispatch Redux action for claiming
      const result = await dispatch(
        claimReferralEarnings({
          tokens: [fee.token],
          account,
        })
      ).unwrap();

      // Show success message
      toast.success(
        `Successfully claimed ${
          fee.amount
        } tokens! Transaction: ${result.transactionHash.slice(0, 10)}...`
      );

      // Refresh the referral fees list
      if (account) {
        dispatch(fetchReferralFees(account));
      }
    } catch (error: any) {
      console.error("Error claiming tokens:", error);
    }
  };

  const handleBulkClaim = async () => {
    try {
      if (!account) {
        toast.error("Please connect your wallet");
        return;
      }

      if (referralFees.length === 0) {
        toast.error("No tokens to claim");
        return;
      }

      // Prepare all token addresses for bulk claim
      const tokens = referralFees.map((fee) => fee.token);

      // Dispatch Redux action for bulk claiming
      const result = await dispatch(
        claimReferralEarnings({
          tokens,
          account,
        })
      ).unwrap();

      // Show success message
      toast.success(
        `Successfully claimed all tokens! Transaction: ${result.transactionHash.slice(
          0,
          10
        )}...`
      );

      // Refresh the referral fees list
      if (account) {
        dispatch(fetchReferralFees(account));
      }
    } catch (error: any) {
      console.error("Error bulk claiming tokens:", error);
    }
  };

  const handleRefresh = () => {
    if (account) {
      dispatch(fetchReferralFees(account));
      fetchTokens();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get token metadata from address
  const getTokenMetadata = (tokenAddress: string) => {
    const token = tokens.find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return token || null;
  };

  const filteredReferralFees = referralFees.filter(
    (fee) => Number(fee.amount) > 0
  );

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
          <p className="text-slate-400">
            Please connect your wallet to view referrals
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 bg-clip-text text-transparent mb-4">
            Referral Dashboard
          </h1>
          <p className="text-slate-400 text-lg">
            Track your referral earnings and claim your rewards
          </p>
        </motion.div>

        {/* Referral Fees List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Claimable Tokens</h2>
            <div className="flex items-center space-x-3">
              {filteredReferralFees.length > 0 && (
                <button
                  onClick={handleBulkClaim}
                  disabled={claiming || loading || tokensLoading}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {claiming
                    ? "Claiming All..."
                    : `Claim All (${filteredReferralFees.length})`}
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={loading || tokensLoading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading || tokensLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-slate-400 mt-4">Loading referral fees...</p>
            </div>
          ) : tokensLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-400 mt-4">Loading token metadata...</p>
            </div>
          ) : filteredReferralFees.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🎯</span>
              <p className="text-slate-400 text-lg">No referral fees found</p>
              <p className="text-slate-500 text-sm mt-2">
                Start referring friends to earn rewards!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Token
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferralFees.map((fee) => (
                    <motion.tr
                      key={fee.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          {(() => {
                            const tokenMetadata = getTokenMetadata(fee.token);
                            console.log(tokenMetadata);
                            return (
                              <>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                                  {tokenMetadata?.image ? (
                                    <img
                                      src={tokenMetadata.image}
                                      alt={tokenMetadata.symbol}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMxMEI5NjEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik04IDhIMTZWMThIOFY4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=";
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-emerald-500/20 flex items-center justify-center">
                                      <span className="text-sm">🪙</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  {tokenMetadata ? (
                                    <>
                                      <p className="text-white font-medium">
                                        {tokenMetadata.symbol}
                                      </p>
                                      <p className="text-slate-400 text-sm">
                                        {tokenMetadata.name}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-white font-medium font-mono">
                                        {fee.token.slice(0, 6)}...
                                        {fee.token.slice(-4)}
                                      </p>
                                      <p className="text-slate-400 text-sm">
                                        Token Address
                                      </p>
                                    </>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-lg font-bold text-emerald-400">
                          {fee.amount}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        {formatDate(fee.createdAt)}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleClaim(fee)}
                          disabled={claiming}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {claiming ? "Claiming..." : "Claim"}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Referrals;
