import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import TokenSelector from "./TokenSelector";
import AmountInput from "./AmountInput";
import { BridgeToken, BridgeTransaction } from "../../../store/bridgeSlice";
import useWallet from "../../../hooks/useWallet";
import { addTokenToWallet, waitForChain, EIP1193Provider } from "../../../utils/walletUtils";
import { useBridgeTransactionPolling } from "../../../hooks/useBridgeTransactionPolling";
import BridgeTransactionProgress from "./BridgeTransactionProgress";
import { useAppDispatch } from "../../../store/hooks";
import {
  clearBridgeTransaction,
  setAmount,
  setSelectedToken,
  clearTransactionHash,
  clearApprovalHash,
} from "../../../store/bridgeSlice";
import AddToWalletButton from "../../../components/AddToWalletButton";
import { TokenInfo } from "../../../utils/walletUtils";
import { toast } from "react-toastify";

interface BridgeCardProps {
  fromNetwork: "ETH" | "PLS";
  toNetwork: "ETH" | "PLS";
  fromChainId: number;
  toChainId: number;
  amount: string;
  selectedToken: string;
  correspondingToken: string;
  onNetworkSwap: () => void;
  onAmountChange: (value: string) => void;
  onTokenSelect: (token: BridgeToken) => void;
  tokens: BridgeToken[];
  loading: boolean;
  error: string | null;
  isBridging: boolean;
  onBridge: () => void;
  estimate: any;
  estimateLoading: boolean;
  estimateError: string | null;
  balance: string;
  balanceLoading: boolean;
  balanceError: string | null;
  transactionHash: string | null;
  isApproving: boolean;
  approvalTxHash: string | null;
  needsApproval: boolean;
  bridgeTransaction: BridgeTransaction | null;
  bridgeTransactionLoading: boolean;
  bridgeTransactionError: string | null;
  onApprove: () => void;
  onSwitchNetwork: () => void;
  onClearTransaction: () => void;
}

const BridgeCard: React.FC<BridgeCardProps> = ({
  fromNetwork,
  toNetwork,
  fromChainId,
  toChainId,
  amount,
  selectedToken,
  correspondingToken,
  onNetworkSwap,
  onAmountChange,
  onTokenSelect,
  tokens,
  loading,
  error,
  isBridging,
  onBridge,
  estimate,
  estimateLoading,
  estimateError,
  balance,
  balanceLoading,
  balanceError,
  transactionHash,
  isApproving,
  approvalTxHash,
  needsApproval,
  bridgeTransaction,
  bridgeTransactionLoading,
  bridgeTransactionError,
  onApprove,
  onSwitchNetwork,
  onClearTransaction,
}) => {
  const dispatch = useAppDispatch();
  const { account, connectWallet, switchToChain, wallet } = useWallet();
  const {
    bridgeTransaction: polledBridgeTransaction,
    isPolling,
    pollingError,
  } = useBridgeTransactionPolling();

  // Use polled bridge transaction if available, otherwise use the one from props
  const currentBridgeTransaction = polledBridgeTransaction || bridgeTransaction;

  // Filter tokens based on the current fromChainId
  const filteredTokens = tokens.filter(
    (token) => token.chainId === fromChainId
  );

  const getNetworkName = (network: "ETH" | "PLS") => {
    return network === "ETH" ? "Ethereum" : "PulseChain";
  };

  const getNetworkColor = (network: "ETH" | "PLS") => {
    return network === "ETH"
      ? "from-blue-500 to-blue-600"
      : "from-emerald-500 to-emerald-600";
  };

  const getNetworkLogo = (network: "ETH" | "PLS"): string | undefined => {
    if (network === "ETH") {
      return "http://api-assets.rubic.exchange/assets/rubic/eth/0x0000000000000000000000000000000000000000/logo_9LYU9u5.png";
    }
    if (network === "PLS") {
      return "http://api-assets.rubic.exchange/assets/coingecko/pulsechain/0x0000000000000000000000000000000000000000/logo.png";
    }
    return undefined;
  };

  const selectedTokenData = filteredTokens.find(
    (token) => token.symbol === selectedToken
  );

  // Find the corresponding token using the new token pair structure
  const correspondingTokenData = tokens.find(
    (token) =>
      token.symbol === correspondingToken && token.chainId === toChainId
  );

  // Clear selected token if it's not available in the current chain
  useEffect(() => {
    if (selectedToken && !selectedTokenData) {
      dispatch(setSelectedToken(null));
    }
  }, [selectedToken, selectedTokenData, dispatch]);

  // Helper function to format amount from wei to human readable
  const formatAmount = (weiAmount: number, decimals: number = 18) => {
    const num = weiAmount / Math.pow(10, decimals);
    // Convert to string with fixed precision first
    const formatted = num.toFixed(6);

    // Remove trailing zeros
    let result = formatted;
    while (result.includes(".") && result.endsWith("0")) {
      result = result.slice(0, -1);
    }
    // Remove trailing decimal point if it exists
    if (result.endsWith(".")) {
      result = result.slice(0, -1);
    }

    return result;
  };

  // Helper function to format balance string (already in human readable format)
  const formatBalance = (balance: string) => {
    if (!balance || balance === "0.00" || balance === "0") return "0";

    // Convert to number and format
    const num = parseFloat(balance);
    if (isNaN(num)) return "0";

    // Convert to string with fixed precision first
    const formatted = num.toFixed(6);

    // Remove trailing zeros
    let result = formatted;
    while (result.includes(".") && result.endsWith("0")) {
      result = result.slice(0, -1);
    }
    // Remove trailing decimal point if it exists
    if (result.endsWith(".")) {
      result = result.slice(0, -1);
    }

    return result;
  };

  // Get current progress step for bridge transaction
  const getCurrentProgressStep = () => {
    if (!currentBridgeTransaction) return 0;

    if (currentBridgeTransaction.status === "executed") return 4;
    if (currentBridgeTransaction.status === "pending") {
      // Calculate progress based on time elapsed for steps 1-4 (Waiting, Confirming, Exchanging, Sending)
      const createdAt = new Date(currentBridgeTransaction.createdAt).getTime();
      const now = Date.now();
      const elapsed = now - createdAt;
      const totalExpectedTime = 15 * 60 * 1000; // 15 minutes in milliseconds
      const progress = Math.min(elapsed / totalExpectedTime, 1);

      // Map progress to steps (0-1 to 1-4)
      // Each step represents ~25% of the total time (since we're only going up to Sending)
      if (progress < 0.35) return 0; // Waiting (0-35%)
      if (progress < 0.65) return 1; // Confirming (35-65%)
      if (progress < 0.9) return 2; // Exchanging (65-90%)
      return 3; // Sending (90-100%) - Stay here until API returns 'executed'
    }
    return 0;
  };

  const getProgressStepName = (step: number) => {
    const steps = [
      "Waiting",
      "Confirming",
      "Exchanging",
      "Sending",
      "Finished",
    ];
    return steps[step] || "Waiting";
  };

  // Removed auto-switching - let users manually select their preferred network

  const handleTokenSelect = async (token: BridgeToken) => {
    onTokenSelect(token);
  };

  const handleNetworkSwap = async () => {
    onNetworkSwap();
  };

  const handleButtonClick = async () => {
    if (!account) {
      // If no account is connected, just connect wallet - no auto-switching
      connectWallet();
    } else if (
      currentBridgeTransaction &&
      currentBridgeTransaction.status === "executed"
    ) {
      // Reset the form when transaction is finished
      resetForm();
    } else if (selectedTokenData && !isOnCorrectNetwork()) {
      // If user is on wrong network, help them switch
      try {
        await switchToChain(fromChainId);
      } catch (error) {
        console.error("Failed to switch network:", error);
        // Show error message to user
        // You could add a toast notification here
      }
    } else {
      onBridge();
    }
  };

  const resetForm = () => {
    // Clear the bridge transaction state
    dispatch(clearBridgeTransaction());

    // Clear the transaction hash
    dispatch(clearTransactionHash());

    // Clear the approval hash
    dispatch(clearApprovalHash());

    // Clear the selected token (set to null instead of first token)
    dispatch(setSelectedToken(null));

    // Clear the amount
    dispatch(setAmount(""));
  };

  const isButtonDisabled = () => {
    if (!account) return false;
    if (!isOnCorrectNetwork()) return false;
    if (isBridging || isApproving) return true;
    if (!selectedTokenData || !amount || parseFloat(amount) <= 0) return true;
    if (estimate && !estimate.isSupported) return true;

    // Don't disable button for wrong network - let user click to switch
    // if (selectedTokenData && !isOnCorrectNetwork()) return true;

    // Check for insufficient balance
    if (balance && parseFloat(amount) > parseFloat(balance)) return true;

    // Check for Ethereum native token minimum amount (0.018 ETH)
    if (
      selectedTokenData &&
      selectedTokenData.address ===
        "0x0000000000000000000000000000000000000000" &&
      fromChainId === 1 && // Ethereum chain
      parseFloat(amount) <= 0.018
    ) {
      return true;
    }

    // Disable button if there's an active bridge transaction (pending)
    if (
      currentBridgeTransaction &&
      currentBridgeTransaction.status === "pending"
    )
      return true;

    return false;
  };

  // Check if user is on the correct source network
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

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

  const isOnCorrectNetwork = () => {
    if (!currentChainId || !selectedTokenData) return false;
    return currentChainId === fromChainId;
  };

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

  const getButtonText = () => {
    if (!account) return "Connect Wallet";
    if (isBridging) return "Bridging...";
    if (isApproving) return "Approving...";
    if (estimate && !estimate.isSupported) return "Bridge Not Supported";

    // Check if user is on the correct source network
    if (selectedTokenData && !isOnCorrectNetwork()) {
      return `Switch to ${getNetworkName(fromNetwork)}`;
    }

    // Handle bridge transaction states
    if (currentBridgeTransaction) {
      if (currentBridgeTransaction.status === "executed") {
        return "Bridge Completed! Start New Bridge";
      } else if (currentBridgeTransaction.status === "pending") {
        const currentStep = getCurrentProgressStep();
        const stepName = getProgressStepName(currentStep);
        return `Bridge in Progress: ${stepName}`;
      }
    }

    if (transactionHash) return "Bridge Completed!";

    // Check for insufficient balance
    if (balance && parseFloat(amount) > parseFloat(balance)) {
      return `Insufficient ${selectedTokenData?.symbol || "Balance"}`;
    }

    // Check for Ethereum native token minimum amount (0.018 ETH)
    if (
      selectedTokenData &&
      selectedTokenData.address ===
        "0x0000000000000000000000000000000000000000" &&
      fromChainId === 1 && // Ethereum chain
      parseFloat(amount) <= 0.018
    ) {
      return "Amount must be greater than 0.018 ETH";
    }

    // Check if approval is needed (for non-native tokens)
    if (
      selectedTokenData &&
      selectedTokenData.address !==
        "0x0000000000000000000000000000000000000000" &&
      needsApproval
    ) {
      return "Approve";
    }

    return "Bridge Tokens";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-[#1e2030] to-[#2b2e4a] rounded-2xl p-6 sm:p-8 flex flex-col gap-6 relative"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm"
        >
          {error}
        </motion.div>
      )}

      {bridgeTransactionLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-yellow-300 text-sm"
        >
          <div className="flex items-center justify-between">
            <span>Submitting bridge transaction to API...</span>
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </motion.div>
      )}

      {bridgeTransactionError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm"
        >
          <div className="flex items-center justify-between">
            <span>Failed to submit bridge transaction to API</span>
          </div>
          <div className="mt-1 text-xs text-red-400/70">
            Error: {bridgeTransactionError}
          </div>
        </motion.div>
      )}

      {/* Bridge Transaction Progress */}
      {currentBridgeTransaction && (
        <BridgeTransactionProgress
          bridgeTransaction={currentBridgeTransaction}
          isPolling={isPolling}
        />
      )}

      {pollingError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm"
        >
          <div className="flex items-center justify-between">
            <span>Failed to poll bridge transaction status</span>
          </div>
          <div className="mt-1 text-xs text-red-400/70">
            Error: {pollingError}
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-r ${getNetworkColor(
                fromNetwork
              )} flex items-center justify-center overflow-hidden`}
            >
              {getNetworkLogo(fromNetwork) ? (
                <img
                  src={getNetworkLogo(fromNetwork)}
                  alt={getNetworkName(fromNetwork)}
                  className="w-5 h-5 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <span
                className={`text-white font-bold text-sm ${
                  getNetworkLogo(fromNetwork) ? "hidden" : ""
                }`}
              >
                {fromNetwork}
              </span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">
                From {getNetworkName(fromNetwork)}
              </h3>
              <p className="text-gray-400 text-sm">Source network</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TokenSelector
            selectedToken={selectedToken}
            onTokenSelect={handleTokenSelect}
            network={fromNetwork}
            tokens={filteredTokens}
            loading={loading}
          />
          <div className="flex items-center gap-2">
            <AmountInput
              value={amount}
              onChange={onAmountChange}
              selectedToken={selectedToken}
              balance={balance}
              balanceLoading={balanceLoading}
              tokenAddress={selectedTokenData?.address}
              fromChainId={fromChainId}
              selectedTokenData={selectedTokenData}
              onCopyAddress={async () => {
                try {
                  await navigator.clipboard.writeText(
                    selectedTokenData?.address || ""
                  );
                  toast.success("Token address copied to clipboard");
                } catch (error) {
                  console.error("Failed to copy address:", error);
                }
              }}
              onAddToWallet={async () => {
                if (!wallet || !selectedTokenData) return;

                try {
                  if (!isOnCorrectNetwork()) {
                    await switchToChain(fromChainId);
                    try {
                      await waitForChain(wallet!.provider as unknown as EIP1193Provider, fromChainId);
                    } catch {
                      // ignore
                    }
                  }

                  const success = await addTokenToWallet(
                    {
                      address: selectedTokenData.address,
                      symbol: cleanTokenSymbol(selectedToken),
                      decimals: selectedTokenData.decimals,
                      chainId: fromChainId,
                      image: selectedTokenData.logoURI,
                    },
                    { provider: wallet.provider as any }
                  );

                  if (success) {
                    // Show success feedback
                  }
                } catch (error) {
                  console.error("Error adding token:", error);
                }
              }}
              showButtons={!!(selectedToken && selectedTokenData)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Balance:</span>
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium">
              {balanceLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </div>
              ) : balanceError ? (
                <span className="text-red-400">Error</span>
              ) : (
                `${formatBalance(balance)} ${selectedToken}`
              )}
            </span>
          </div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleNetworkSwap}
        disabled={true}
        className="cursor-not-allowed -full flex items-center justify-center py-4 bg-gradient-to-r from-[#3a3f5a] to-[#2b2e4a] hover:from-[#4a4f6a] hover:to-[#3a3f5a] rounded-xl border border-[#4a4f6a] hover:border-[#5a5f7a] transition-all duration-300 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
          <span className="text-gray-300 font-medium">
            Swap Networks & Tokens
          </span>
        </div>
      </motion.button>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-r ${getNetworkColor(
                toNetwork
              )} flex items-center justify-center overflow-hidden`}
            >
              {getNetworkLogo(toNetwork) ? (
                <img
                  src={getNetworkLogo(toNetwork)}
                  alt={getNetworkName(toNetwork)}
                  className="w-5 h-5 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <span
                className={`text-white font-bold text-sm ${
                  getNetworkLogo(toNetwork) ? "hidden" : ""
                }`}
              >
                {toNetwork}
              </span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">
                To {getNetworkName(toNetwork)}
              </h3>
              <p className="text-gray-400 text-sm">Destination network</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2b2e4a] to-[#1e2030] rounded-xl p-4 border border-[#3a3f5a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center overflow-hidden">
                {correspondingTokenData?.logoURI ? (
                  <img
                    src={correspondingTokenData.logoURI}
                    alt={correspondingToken}
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <span
                  className={`text-white font-bold text-sm ${
                    correspondingTokenData?.logoURI ? "hidden" : ""
                  }`}
                >
                  {correspondingToken}
                </span>
              </div>
              <div>
                <div className="text-white font-semibold text-base">
                  {correspondingToken}
                </div>
                <div className="text-gray-400 text-sm">
                  {getNetworkName(toNetwork)}
                </div>
              </div>
            </div>

            <div className="text-right">
              {estimateLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-emerald-400 text-sm">
                    Calculating...
                  </span>
                </div>
              ) : estimate ? (
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <span className="text-white font-semibold text-lg">
                      {estimate.estimatedAmount
                        ? formatAmount(
                            estimate.estimatedAmount,
                            selectedTokenData?.decimals
                          )
                        : amount || "0.00"}
                    </span>

                    {correspondingToken && correspondingTokenData && account && (
                      <AddToWalletButton
                        token={{
                          address: correspondingTokenData.address,
                          symbol: cleanTokenSymbol(correspondingToken),
                          decimals: correspondingTokenData.decimals,
                          chainId: toChainId,
                          image: correspondingTokenData.logoURI,
                        }}
                        variant="outline"
                        size="sm"
                      />
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Fee: {" "}
                    {estimate.fee
                      ? formatAmount(estimate.fee, selectedTokenData?.decimals)
                      : "0.00"}{" "}
                    ({estimate.feePercentage || 0}%)
                  </div>
                  <div className="text-gray-400 text-sm">≈ $0.00</div>
                </div>
              ) : estimateError ? (
                <div className="text-red-400 text-sm">
                  Error loading estimate
                </div>
              ) : (
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <span className="text-white font-semibold text-lg">
                      {amount || "0.00"}
                    </span>

                    {correspondingToken && correspondingTokenData && account && (
                      <>
                        <button
                          onClick={async () => {
                            if (correspondingTokenData?.address) {
                              try {
                                await navigator.clipboard.writeText(
                                  correspondingTokenData.address
                                );
                                toast && toast.success
                                  ? toast.success("Token address copied to clipboard")
                                  : null;
                              } catch (error) {
                                console.error("Failed to copy address:", error);
                              }
                            }
                          }}
                          className="p-1.5 hover:bg-[#3a3f5a]/50 rounded-lg transition-colors duration-200"
                          title="Copy token address"
                        >
                          <svg
                            className="w-4 h-4 text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                        <AddToWalletButton
                          token={{
                            address: correspondingTokenData.address,
                            symbol: cleanTokenSymbol(correspondingToken),
                            decimals: correspondingTokenData.decimals,
                            chainId: toChainId,
                            image: correspondingTokenData.logoURI,
                          }}
                          variant="outline"
                          size="sm"
                        />
                      </>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">≈ $0.00</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleButtonClick}
        disabled={isButtonDisabled()}
        className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
          isButtonDisabled()
            ? "bg-gray-100/10 border-2 border-gray-400/30 text-gray-300 cursor-not-allowed hover:bg-gray-100/15"
            : selectedTokenData && !isOnCorrectNetwork()
            ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
        }`}
      >
        {isBridging || isApproving ? (
          <div className="flex items-center justify-center space-x-3">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>{isApproving ? "Approving..." : "Bridging..."}</span>
          </div>
        ) : currentBridgeTransaction &&
          currentBridgeTransaction.status === "pending" ? (
          <div className="flex items-center justify-center space-x-3">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>{getButtonText()}</span>
          </div>
        ) : (
          getButtonText()
        )}
      </motion.button>
    </motion.div>
  );
};

export default BridgeCard;
