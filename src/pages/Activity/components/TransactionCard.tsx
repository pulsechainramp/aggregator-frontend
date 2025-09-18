import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BridgeTransaction } from "../../../store/bridgeSlice";
import { useAppSelector } from "../../../store/hooks";
import { useAppDispatch } from "../../../store/hooks";
import { fetchTransactionStatus } from "../../../store/activitySlice";
import { addTokenToWallet } from "../../../utils/walletUtils";
import { TokenInfo } from "../../../utils/walletUtils";
import useWallet from "../../../hooks/useWallet";

interface TransactionCardProps {
  transaction: BridgeTransaction;
  onRefresh: () => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onRefresh,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const dispatch = useAppDispatch();
  const { wallet, switchToChain } = useWallet();
  
  // Get token pairs from bridge store to find corresponding tokens
  const { tokenPairs } = useAppSelector((state) => state.bridge);

  // Get current network from wallet
  useEffect(() => {
    const getCurrentChainId = async () => {
      if (wallet?.provider) {
        try {
          const chainId = await wallet.provider.request({
            method: "eth_chainId",
          });
          setCurrentChainId(parseInt(chainId, 16));
        } catch (error) {
          console.error("Failed to get current chain ID:", error);
        }
      }
    };

    getCurrentChainId();

    // Listen for chain changes
    if (wallet?.provider) {
      const handleChainChanged = (chainId: string) => {
        setCurrentChainId(parseInt(chainId, 16));
      };

      wallet.provider.on("chainChanged", handleChainChanged);

      return () => {
        wallet.provider.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [wallet]);

  // Get current network name
  const getCurrentNetworkName = () => {
    if (!currentChainId) return "Unknown";
    if (currentChainId === 1) return "Ethereum";
    if (currentChainId === 369) return "PulseChain";
    return `Chain ID ${currentChainId}`;
  };

  // Helper function to clean token symbols (remove network suffixes)
  const cleanTokenSymbol = (symbol: string): string => {
    if (symbol.includes(" from Ethereum")) {
      return symbol.replace(" from Ethereum", "");
    } else if (symbol.includes(" from PulseChain")) {
      return symbol.replace(" from PulseChain", "");
    }
    return symbol;
  };

  const getCorrespondingTokens = () => {
    if (!tokenPairs || tokenPairs.length === 0) return { fromToken: null, toToken: null };

    const cleanTokenSymbol = (symbol: string): string => {
      if (symbol.includes(" from Ethereum")) {
        return symbol.replace(" from Ethereum", "");
      } else if (symbol.includes(" from PulseChain")) {
        return symbol.replace(" from PulseChain", "");
      }
      return symbol;
    };

    const baseSymbol = cleanTokenSymbol(transaction.tokenSymbol);
    
    for (const pair of tokenPairs) {
      if (pair.from.symbol === baseSymbol || pair.to.symbol === baseSymbol) {
        const fromToken: TokenInfo = {
          address: pair.from.address,
          symbol: cleanTokenSymbol(pair.from.symbol),
          decimals: pair.from.decimals,
          chainId: pair.from.chainId,
          image: pair.from.logoURI,
        };

        const toToken: TokenInfo = {
          address: pair.to.address,
          symbol: cleanTokenSymbol(pair.to.symbol),
          decimals: pair.to.decimals,
          chainId: pair.to.chainId,
          image: pair.to.logoURI,
        };

        return { fromToken, toToken };
      }
    }

    return { fromToken: null, toToken: null };
  };

  const { fromToken, toToken } = getCorrespondingTokens();

  const getTokenLogo = (
    token: any,
    fallbackSymbol: string,
    size: "sm" | "md" | "lg" = "md"
  ) => {
    const sizeClasses = {
      sm: "w-8 h-8",
      md: "w-10 h-10",
      lg: "w-12 h-12",
    };

    if (token?.logoURI) {
      return (
        <img
          src={token.logoURI}
          alt={token.symbol}
          className={`${sizeClasses[size]} rounded-full object-cover`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            target.nextElementSibling?.classList.remove("hidden");
          }}
        />
      );
    }

    if (token?.image) {
      return (
        <img
          src={token.image}
          alt={token.symbol}
          className={`${sizeClasses[size]} rounded-full object-cover`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            target.nextElementSibling?.classList.remove("hidden");
          }}
        />
      );
    }

    return (
      <div
        className={`${
          sizeClasses[size]
        } rounded-full flex items-center justify-center text-white font-bold ${
          token?.chainId === 1
            ? "bg-gradient-to-br from-blue-500 to-purple-500"
            : "bg-gradient-to-br from-green-500 to-emerald-500"
        }`}
      >
        {(token?.symbol || fallbackSymbol).charAt(0)}
      </div>
    );
  };

  // Handle adding token to wallet
  const handleAddToWallet = async (token: TokenInfo) => {
    if (!wallet) {
      console.error("No wallet connected");
      return;
    }

    try {
      if (!currentChainId) {
        console.error("Current chain ID not available");
        return;
      }

      if (currentChainId !== token.chainId) {
        const networkName = token.chainId === 1 ? "Ethereum" : "PulseChain";
        
        await switchToChain(token.chainId);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const success = await addTokenToWallet(token, wallet);
      
      if (success) {
        // Token added successfully
      } else {
        console.error(`Failed to add ${token.symbol} to wallet`);
      }
    } catch (error) {
      console.error(`Failed to add ${token.symbol} to wallet:`, error);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "executed":
        return {
          color: "text-green-400",
          bgColor: "bg-green-400/10",
          borderColor: "border-green-400/30",
          icon: "✅",
          message: "Bridge Completed",
        };
      case "pending":
        return {
          color: "text-yellow-400",
          bgColor: "bg-yellow-400/10",
          borderColor: "border-yellow-400/30",
          icon: "⏳",
          message: "Bridge in Progress",
        };
      case "failed":
        return {
          color: "text-red-400",
          bgColor: "bg-red-400/10",
          borderColor: "border-red-400/30",
          icon: "❌",
          message: "Bridge Failed",
        };
      default:
        return {
          color: "text-gray-400",
          bgColor: "bg-gray-400/10",
          borderColor: "border-gray-400/30",
          icon: "❓",
          message: "Unknown Status",
        };
    }
  };

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return "Ethereum";
      case 369:
        return "PulseChain";
      default:
        return `Chain ${chainId}`;
    }
  };

  const formatAmount = (amount: string, decimals: number) => {
    try {
      const num = parseFloat(amount) / Math.pow(10, decimals);
      return num.toFixed(6);
    } catch {
      return amount;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return "just now";
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? "s" : ""} ago`;
      }
    } catch {
      return "Unknown";
    }
  };

  const openExplorer = (txHash: string, chainId: number) => {
    let explorerUrl = "";
    if (chainId === 1) {
      explorerUrl = `https://etherscan.io/tx/${txHash}`;
    } else if (chainId === 369) {
      explorerUrl = `https://scan.pulsechain.com/tx/${txHash}`;
    }

    if (explorerUrl) {
      window.open(explorerUrl, "_blank");
    }
  };

  const handleRefreshStatus = () => {
    dispatch(fetchTransactionStatus(transaction.messageId));
  };

  const statusInfo = getStatusInfo(transaction.status);

  return (
    <motion.div
      initial={false}
      animate={{ height: isExpanded ? "auto" : "auto" }}
      className="p-6 hover:bg-[#2a2d3a] transition-colors duration-200"
    >
      {/* Main Transaction Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side - Token and Amount */}
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {getTokenLogo(fromToken, transaction.tokenSymbol, "lg")}
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-lg font-semibold">
                {transaction.humanReadableAmount ||
                  formatAmount(transaction.amount, transaction.tokenDecimals)}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">{transaction.tokenSymbol}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>{getChainName(transaction.sourceChainId)}</span>
              </span>
              <span className="text-blue-400">→</span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{getChainName(transaction.targetChainId)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Status and Actions */}
        <div className="flex items-center space-x-4">
          {/* Status Badge */}
          <div
            className={`px-3 py-2 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">{statusInfo.icon}</span>
              <span className={`font-medium ${statusInfo.color}`}>
                {statusInfo.message}
              </span>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#3a3f5a] rounded-lg transition-all duration-200"
          >
            <svg
              className={`w-5 h-5 transform transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-6 pt-6 border-t border-[#3a3f5a]"
        >
          {/* Token Information Section */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-300 mb-4">
              Token Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Token */}
              <div className="bg-[#2a2d3a] rounded-lg p-4 border border-[#3a3f5a]">
                <div className="flex items-center space-x-3 mb-3">
                  {getTokenLogo(fromToken, transaction.tokenSymbol, "md")}
                  <div>
                    <h5 className="font-medium text-white">From Token</h5>
                    <p className="text-sm text-gray-400">
                      {getChainName(transaction.sourceChainId)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {"name" in (fromToken || {}) && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Name:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">
                          {(fromToken as any).name}
                        </span>
                        {fromToken && (
                          <button
                            onClick={() => handleAddToWallet(fromToken)}
                            className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                            title="Click to add token to wallet"
                          >
                            <img 
                              src="/metamask.png" 
                              alt="MetaMask" 
                              className="w-4 h-4"
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Symbol:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">
                        {fromToken?.symbol || transaction.tokenSymbol}
                      </span>
                      {fromToken && (
                        <button
                          onClick={() => handleAddToWallet(fromToken)}
                          className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                          title="Click to add token to wallet"
                        >
                          <img 
                            src="/metamask.png" 
                            alt="MetaMask" 
                            className="w-4 h-4"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Address:</span>
                    <span className="text-xs font-mono text-gray-300 break-all">
                      {fromToken?.address || transaction.tokenAddress}
                    </span>
                  </div>
                </div>
              </div>

              {/* To Token */}
              <div className="bg-[#2a2d3a] rounded-lg p-4 border border-[#3a3f5a]">
                <div className="flex items-center space-x-3 mb-3">
                  {getTokenLogo(toToken, transaction.tokenSymbol, "md")}
                  <div>
                    <h5 className="font-medium text-white">To Token</h5>
                    <p className="text-sm text-gray-400">
                      {getChainName(transaction.targetChainId)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {"name" in (toToken || {}) && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Name:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">
                          {(toToken as any).name}
                        </span>
                        {toToken && (
                          <button
                            onClick={() => handleAddToWallet(toToken)}
                            className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                            title="Click to add token to wallet"
                          >
                            <img 
                              src="/metamask.png" 
                              alt="MetaMask" 
                              className="w-4 h-4"
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Symbol:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">
                        {toToken?.symbol || transaction.tokenSymbol}
                      </span>
                      {toToken && (
                        <button
                          onClick={() => handleAddToWallet(toToken)}
                          className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                          title="Click to add token to wallet"
                        >
                          <img 
                            src="/metamask.png" 
                            alt="MetaMask" 
                            className="w-4 h-4"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Address:</span>
                    <span className="text-xs font-mono text-gray-300 break-all">
                      {toToken?.address || transaction.tokenAddress}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transaction Details */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-300 mb-3">
                Transaction Details
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Message ID:</span>
                  <span className="text-sm font-mono text-gray-300 break-all">
                    {transaction.messageId}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-medium">
                    {transaction.humanReadableAmount ||
                      formatAmount(
                        transaction.amount,
                        transaction.tokenDecimals
                      )}{" "}
                    {transaction.tokenSymbol}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-gray-300">
                    {formatDate(transaction.createdAt)}
                  </span>
                </div>

                {transaction.updatedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Updated:</span>
                    <span className="text-gray-300">
                      {formatDate(transaction.updatedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction Hashes */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-300 mb-3">
                Transaction Hashes
              </h4>

              <div className="space-y-3">
                {/* Source Transaction */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">
                      Source ({getChainName(transaction.sourceChainId)})
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(transaction.sourceTimestamp)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono text-gray-300 break-all">
                      {transaction.sourceTxHash}
                    </span>
                    <button
                      onClick={() =>
                        openExplorer(
                          transaction.sourceTxHash,
                          transaction.sourceChainId
                        )
                      }
                      className="text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                      View
                    </button>
                  </div>
                </div>

                {/* Target Transaction */}
                {transaction.targetTxHash && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">
                        Target ({getChainName(transaction.targetChainId)})
                      </span>
                      {transaction.targetTimestamp && (
                        <span className="text-xs text-gray-500">
                          {formatDate(transaction.targetTimestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono text-gray-300 break-all">
                        {transaction.targetTxHash}
                      </span>
                      <button
                        onClick={() =>
                          openExplorer(
                            transaction.targetTxHash!,
                            transaction.targetChainId
                          )
                        }
                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                      >
                        View
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRefreshStatus}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Refresh Status
            </motion.button>

            {transaction.status === "pending" && (
              <div className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm border border-yellow-500/30">
                ⏳ Bridge in progress.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TransactionCard;
