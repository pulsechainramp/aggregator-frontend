import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
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
import { tryParseAmountToWei } from "../../../utils/amount";
import { ZeroAddress } from "../../../const/swap";
import {
  MIN_NATIVE_ETH_AMOUNT_WEI,
  MIN_NATIVE_ETH_AMOUNT_DISPLAY,
  MIN_BRIDGE_USD_AMOUNT,
} from "../constants";
import TokenIcon from "../../../components/TokenIcon";

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
  onRefreshBalance?: () => void;
  isRefreshingBalance?: boolean;
  transactionHash: string | null;
  isApproving: boolean;
  approvalTxHash: string | null;
  needsApproval: boolean;
  bridgeTransaction: BridgeTransaction | null;
  bridgeTransactionLoading: boolean;
  bridgeTransactionError: string | null;
  isSourceNetworkSupported?: boolean;
  unsupportedReason?: string;
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
  onRefreshBalance,
  isRefreshingBalance = false,
  transactionHash,
  isApproving,
  approvalTxHash,
  needsApproval,
  bridgeTransaction,
  bridgeTransactionLoading,
  bridgeTransactionError,
  isSourceNetworkSupported = true,
  unsupportedReason,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { account, connectWallet, switchToChain, wallet } = useWallet();
  const {
    bridgeTransaction: polledBridgeTransaction,
    isPolling,
    pollingError,
  } = useBridgeTransactionPolling();

  // Use polled bridge transaction if available, otherwise use the one from props
  const currentBridgeTransaction = polledBridgeTransaction || bridgeTransaction;
  const hasActiveBridge = Boolean(currentBridgeTransaction);
  const bridgeCompleted =
    hasActiveBridge && currentBridgeTransaction.status === "executed";
  const bridgeFormHidden = bridgeTransactionLoading || hasActiveBridge;
  const bridgeInFlight = bridgeFormHidden && !bridgeCompleted;
  const showBridgeForm = !bridgeFormHidden;

  // Filter tokens based on the current fromChainId
  const filteredTokens = tokens.filter(
    (token) => token.chainId === fromChainId
  );

  const directionSupportMessage =
    unsupportedReason ??
    "PulseBridge currently supports bridging from Ethereum to PulseChain only.";

  const refreshDisabled =
    !account || balanceLoading || isRefreshingBalance;

  const getNetworkName = (network: "ETH" | "PLS") => {
    return network === "ETH" ? "Ethereum" : "PulseChain";
  };

  const getNetworkBadgeClass = (network: "ETH" | "PLS") => {
    return network === "ETH"
      ? "bg-primary-050 text-primary"
      : "bg-success/10 text-success";
  };

  // Prefer our bundled static logos for native chain badges
  const getNetworkLogo = (network: "ETH" | "PLS"): string | undefined => {
    if (network === "ETH") {
      return "/token-logos/eth/0x0000000000000000000000000000000000000000.png";
    }
    if (network === "PLS") {
      return "/token-logos/pulsex/369/0x0000000000000000000000000000000000000000.png";
    }
    return undefined;
  };

  const selectedTokenData = filteredTokens.find(
    (token) => token.symbol === selectedToken
  );

  const stableSymbols = ["USDC", "USDT", "DAI"];
  const fallbackUsdPriceBySymbol: Record<string, number> = {
    WBTC: 60000, // approximate BTC peg for minimum warning only
  };

  const tokenDecimals = selectedTokenData?.decimals ?? 18;
  const amountWei = tryParseAmountToWei(amount, tokenDecimals);
  const balanceWei = tryParseAmountToWei(balance, tokenDecimals);
  const hasPositiveAmount = amountWei !== null && amountWei > 0n;
  const insufficientBalance =
    amountWei !== null &&
    balanceWei !== null &&
    amountWei > balanceWei;
  const isEthNative =
    selectedTokenData?.address === ZeroAddress && fromChainId === 1;
  const isBelowMinimum =
    isEthNative &&
    amountWei !== null &&
    amountWei > 0n &&
    amountWei < MIN_NATIVE_ETH_AMOUNT_WEI;

  const computeUsdEstimate = (): number | null => {
    if (!selectedTokenData) return null;
    const amountNum = Number(amount || "0");
    if (!Number.isFinite(amountNum) || amountNum <= 0) return null;

    const symbol = (selectedTokenData.symbol || "").toUpperCase();
    if (stableSymbols.includes(symbol)) {
      return amountNum; // assume $1 per unit for stablecoins
    }

    const fallbackPrice = fallbackUsdPriceBySymbol[symbol];
    if (fallbackPrice) {
      return amountNum * fallbackPrice;
    }

    // For native ETH we rely on the explicit ETH minimum instead of USD
    return null;
  };

  const usdEstimate = computeUsdEstimate();
  const isBelowUsdMinimum =
    usdEstimate !== null &&
    usdEstimate > 0 &&
    usdEstimate < MIN_BRIDGE_USD_AMOUNT;

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

  const handleNavigateToSwap = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lastTab", "/swap");
      }
    } catch {
      // ignore storage failures
    }
    navigate("/swap");
  };

  const handleButtonClick = async () => {
    if (!account) {
      // If no account is connected, just connect wallet - no auto-switching
      connectWallet();
      return;
    }

    if (!isSourceNetworkSupported) {
      toast.error(directionSupportMessage);
      return;
    }

    if (
      currentBridgeTransaction &&
      currentBridgeTransaction.status === "executed"
    ) {
      // Reset the form when transaction is finished
      resetForm();
      return;
    }

    if (selectedTokenData && !isOnCorrectNetwork()) {
      // If user is on wrong network, help them switch
      try {
        await switchToChain(fromChainId);
      } catch (error) {
        console.error("Failed to switch network:", error);
        // Show error message to user
        // You could add a toast notification here
      }
      return;
    }

    onBridge();
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
    if (!isSourceNetworkSupported) return true;
    if (!isOnCorrectNetwork()) return false;
    if (isBridging || isApproving) return true;
    if (!selectedTokenData || !hasPositiveAmount) return true;
    if (estimate && !estimate.isSupported) return true;

    // Don't disable button for wrong network - let user click to switch
    // if (selectedTokenData && !isOnCorrectNetwork()) return true;

    // Check for insufficient balance
    if (insufficientBalance) return true;

    // Check for Ethereum native token minimum amount (0.018 ETH) or USD guideline
    if (
      selectedTokenData &&
      (isBelowMinimum || isBelowUsdMinimum)
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
    if (!isSourceNetworkSupported) return "Direction Not Supported";
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
    if (insufficientBalance) {
      return `Insufficient ${selectedTokenData?.symbol || "Balance"}`;
    }

    // Check for Ethereum native token minimum amount (0.018 ETH)
    if (isBelowMinimum) {
      return `Amount must be greater than ${MIN_NATIVE_ETH_AMOUNT_DISPLAY} ETH`;
    }

    if (isBelowUsdMinimum) {
      return `Amount must be at least $${MIN_BRIDGE_USD_AMOUNT}`;
    }

    // Check if approval is needed (for non-native tokens)
    if (
      selectedTokenData &&
      selectedTokenData.address !== ZeroAddress &&
      needsApproval
    ) {
      return "Approve";
    }

    return "Bridge Tokens";
  };

  const isConnectState = !account;
  const needsNetworkSwitch = Boolean(
    account && selectedTokenData && !isOnCorrectNetwork()
  );
  const disabled = isButtonDisabled();

  const buttonClasses = disabled
    ? "cursor-not-allowed border-2 border-gray-400/30 bg-gray-100/10 text-text-muted hover:bg-gray-100/15"
    : needsNetworkSwitch || isConnectState
      ? "border border-primary bg-primary-050 text-primary hover:border-primary hover:bg-primary-050/80"
      : "border border-transparent bg-primary text-white hover:bg-primary-600";

  return (
    <div className="relative flex flex-col gap-6 rounded-2xl border border-border bg-bg-surface p-4 shadow-floating sm:p-8">
      {!isSourceNetworkSupported && (
        <div className="rounded-lg border border-warning bg-warning/10 p-3 text-sm text-warning">
          {directionSupportMessage}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {bridgeTransactionLoading && (
        <div className="rounded-lg border border-warning bg-warning/10 p-3 text-sm text-warning">
          <div className="flex items-center justify-between">
            <span>Submitting bridge transaction to API...</span>
            <div className="h-4 w-4 rounded-full border-2 border-warning border-t-transparent animate-spin"></div>
          </div>
        </div>
      )}

      {bridgeTransactionError && (
        <div className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
          <div className="flex items-center justify-between">
            <span>Failed to submit bridge transaction to API</span>
          </div>
          <div className="mt-1 text-xs text-danger/80">
            Error: {bridgeTransactionError}
          </div>
        </div>
      )}

      {/* Bridge Transaction Progress */}
      {currentBridgeTransaction && (
        <BridgeTransactionProgress
          bridgeTransaction={currentBridgeTransaction}
          isPolling={isPolling}
          onBridgeAnother={resetForm}
          onSwap={handleNavigateToSwap}
          pollingError={pollingError}
        />
      )}

      {pollingError && (
        <div className="rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
          <div className="flex items-center justify-between">
            <span>Failed to poll bridge transaction status</span>
          </div>
          <div className="mt-1 text-xs text-danger/80">
            Error: {pollingError}
          </div>
        </div>
      )}

      {showBridgeForm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border border-border ${getNetworkBadgeClass(
                  fromNetwork
                )} overflow-hidden`}
              >
                {getNetworkLogo(fromNetwork) ? (
                  <img
                    src={getNetworkLogo(fromNetwork)}
                    alt={getNetworkName(fromNetwork)}
                    className="h-5 w-5 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <span
                  className={`text-sm font-semibold ${getNetworkLogo(fromNetwork) ? "hidden" : ""
                    }`}
                >
                  {fromNetwork}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text">
                  From {getNetworkName(fromNetwork)}
                </h3>
                <p className="text-sm text-text-muted">Source network</p>
              </div>
            </div>
            {onRefreshBalance && (
              <button
                type="button"
                onClick={onRefreshBalance}
                disabled={refreshDisabled}
                className="flex items-center justify-center rounded-full border border-border px-2.5 py-2 text-text-muted transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
                title="Refresh balance"
                aria-label="Refresh balance"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${isRefreshingBalance ? "animate-spin text-primary" : ""
                    }`}
                />
              </button>
            )}
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
                usdValue={usdEstimate}
                usdMinimum={MIN_BRIDGE_USD_AMOUNT}
                isBelowUsdMinimum={isBelowUsdMinimum}
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

                    const result = await addTokenToWallet(
                      {
                        address: selectedTokenData.address,
                        symbol: cleanTokenSymbol(selectedToken),
                        decimals: selectedTokenData.decimals,
                        chainId: fromChainId,
                        logoURI: selectedTokenData.logoURI,
                        image: selectedTokenData.logoURI,
                      },
                      { provider: wallet.provider as any }
                    );

                    if (!result.ok) {
                      console.error(`Failed to add ${selectedTokenData.symbol}: ${result.reason}`);
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
            <span className="text-text-subtle">Balance:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text">
                {balanceLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border border-border border-t-transparent animate-spin"></div>
                    <span className="text-text-subtle">Loading...</span>
                  </div>
                ) : balanceError ? (
                  <span className="text-danger">Error</span>
                ) : (
                  `${formatBalance(balance)} ${selectedToken}`
                )}
              </span>
            </div>
          </div>
        </div>
      )}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleNetworkSwap}
        disabled={true}
        className="hidden cursor-not-allowed items-center justify-center rounded-xl border border-border bg-bg-page px-4 py-4 text-sm font-semibold text-text"
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-text-muted"
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
          <span className="text-text-muted font-medium">
            Swap Networks & Tokens
          </span>
        </div>
      </motion.button>

      {showBridgeForm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border border-border ${getNetworkBadgeClass(
                  toNetwork
                )} overflow-hidden`}
              >
                {getNetworkLogo(toNetwork) ? (
                  <img
                    src={getNetworkLogo(toNetwork)}
                    alt={getNetworkName(toNetwork)}
                    className="h-5 w-5 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <span
                  className={`text-sm font-semibold ${getNetworkLogo(toNetwork) ? "hidden" : ""
                    }`}
                >
                  {toNetwork}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text">
                  To {getNetworkName(toNetwork)}
                </h3>
                <p className="text-sm text-text-muted">Destination network</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-3">
                <TokenIcon
                  token={{
                    symbol: correspondingToken,
                    logoURI: correspondingTokenData?.logoURI,
                    image: correspondingTokenData?.logoURI,
                  }}
                  size={40}
                />
                <div>
                  <div className="text-base font-semibold text-text">
                    {correspondingToken}
                  </div>
                  <div className="text-sm text-text-muted">
                    {getNetworkName(toNetwork)}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {estimateLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                    <span className="text-sm text-text-muted">
                      Calculating...
                    </span>
                  </div>
                ) : estimate ? (
                  <div className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <span className="text-lg font-semibold text-text">
                        {estimate.estimatedAmount
                          ? formatAmount(
                            estimate.estimatedAmount,
                            selectedTokenData?.decimals
                          )
                          : amount || "0.00"}
                      </span>

                      {correspondingToken && correspondingTokenData && account && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  correspondingTokenData.address || ""
                                );
                                toast.success("Token address copied to clipboard");
                              } catch (error) {
                                console.error("Failed to copy address:", error);
                              }
                            }}
                            className="flex-shrink-0 rounded-lg border border-border bg-bg-page px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            title="Copy token address"
                          >
                            <svg
                              className="h-4 w-4"
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
                          </motion.button>
                          <AddToWalletButton
                            token={{
                              address: correspondingTokenData.address,
                              symbol: cleanTokenSymbol(correspondingToken),
                              decimals: correspondingTokenData.decimals,
                              chainId: toChainId,
                              logoURI: correspondingTokenData.logoURI,
                              image: correspondingTokenData.logoURI,
                            }}
                            variant="outline"
                            size="sm"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ) : estimateError ? (
                  <div className="text-danger text-sm">
                    Error loading estimate
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <span className="text-lg font-semibold text-text">
                        {amount || "0.00"}
                      </span>

                      {correspondingToken && correspondingTokenData && account && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  correspondingTokenData.address || ""
                                );
                                toast.success("Token address copied to clipboard");
                              } catch (error) {
                                console.error("Failed to copy address:", error);
                              }
                            }}
                            className="flex-shrink-0 rounded-lg border border-border bg-bg-page px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            title="Copy token address"
                          >
                            <svg
                              className="w-4 h-4"
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
                          </motion.button>
                          <AddToWalletButton
                            token={{
                              address: correspondingTokenData.address,
                              symbol: cleanTokenSymbol(correspondingToken),
                              decimals: correspondingTokenData.decimals,
                              chainId: toChainId,
                              logoURI: correspondingTokenData.logoURI,
                              image: correspondingTokenData.logoURI,
                            }}
                            variant="outline"
                            size="sm"
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBridgeForm && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleButtonClick}
          disabled={disabled}
          className={`mt-2 sm:mt-4 w-full rounded-xl py-4 text-lg font-semibold transition-all duration-300 shadow-sm ${buttonClasses}`}
        >
          {isBridging || isApproving ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              <span>{isApproving ? "Approving..." : "Bridging..."}</span>
            </div>
          ) : currentBridgeTransaction &&
            currentBridgeTransaction.status === "pending" ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              <span>{getButtonText()}</span>
            </div>
          ) : (
            getButtonText()
          )}
        </motion.button>
      )}
    </div>
  );
};

export default BridgeCard;
