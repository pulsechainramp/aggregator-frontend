import React, { useEffect, useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  BridgeToken,
  fetchTokenPairs,
  setSelectedToken,
  setAmount,
  swapChains,
  clearEstimate,
  bridgeTokens,
  fetchBridgeEstimate,
  fetchBalance,
  clearTransactionHash,
  setNeedsApproval,
  fetchBridgeGasCost,
  clearGasCost,
} from "../../store/bridgeSlice";
import { checkTokenApproval } from "../../contracts/BridgeContract";
import { initializeBridgeManager } from "../../contracts/BridgeContract";
import BridgeHeader from "./components/BridgeHeader";
import BridgeCard from "./components/BridgeCard";
import useWallet from "../../hooks/useWallet";
import useEthBalance from "../../hooks/useEthBalance";
import { OnRampBanner, OnRampModal } from "../../components/onramp";
import { useState } from "react";
import { ZeroAddress } from "../../const/swap";
import {
  isPositiveAmount as isPositiveAmountHelper,
  tryParseAmountToWei,
} from "../../utils/amount";
import { formatEther } from "ethers";
import { MIN_NATIVE_ETH_AMOUNT_WEI } from "./constants";

const Bridge: React.FC = () => {
  const dispatch = useAppDispatch();
  const { account } = useWallet();
  const {
    tokens,
    tokenPairs,
    loading,
    error,
    fromChainId,
    toChainId,
    selectedToken,
    amount,
    isBridging,
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
    gasCostWei,
    gasCostLoading,
  } = useAppSelector((state) => state.bridge);
  const [isBalanceRefreshing, setIsBalanceRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchTokenPairs());
  }, [dispatch]);

  // Default bridge token: ETH (=> WETH on PulseChain)
  useEffect(() => {
    if (!selectedToken && tokens && tokens.length > 0) {
      const preferred =
        fromChainId === 369
          ? [
              "WETH from Ethereum",
              "USDC from Ethereum",
              "USDT from Ethereum",
              "DAI from Ethereum",
              "WBTC from Ethereum",
            ]
          : ["ETH", "WETH", "USDC", "USDT", "DAI", "WBTC"];

      const def = preferred
        .map((sym) =>
          tokens.find(
            (t) => t.chainId === fromChainId && t.symbol === sym
          )
        )
        .find(Boolean);

      if (def) {
        dispatch(setSelectedToken(def));
      }
    }
  }, [tokens, fromChainId, selectedToken, dispatch]);

  const debouncedFetchEstimate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (
        tokenAddress: string,
        networkId: number,
        targetChainId: number,
        amount: string
      ) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          dispatch(
            fetchBridgeEstimate({
              tokenAddress,
              networkId,
              targetChainId,
              amount,
            })
          );
        }, 300);
      };
    })(),
    [dispatch]
  );

  const convertToWei = (value: string, decimals: number): string => {
    const wei = tryParseAmountToWei(value, decimals);
    return wei ? wei.toString() : "0";
  };

  const hasPositiveAmount = (value: string, decimals: number): boolean => {
    return isPositiveAmountHelper(value, decimals);
  };

  // Fetch estimate when token, network, or amount changes
  useEffect(() => {
    if (
      !selectedToken ||
      !amount ||
      !hasPositiveAmount(amount, selectedToken.decimals)
    ) {
      dispatch(clearEstimate());
      return;
    }

    const amountInWei = convertToWei(amount, selectedToken.decimals);
    debouncedFetchEstimate(
      selectedToken.address,
      fromChainId,
      toChainId,
      amountInWei
    );
  }, [
    selectedToken,
    fromChainId,
    toChainId,
    amount,
    debouncedFetchEstimate,
  ]);

  // Fetch balance when token or chain changes
  useEffect(() => {
    if (selectedToken && account) {
      dispatch(fetchBalance({
        tokenAddress: selectedToken.address,
        account: account,
        chainId: fromChainId,
        decimals: selectedToken.decimals
      }));
    }
  }, [selectedToken, fromChainId, account, dispatch]);

  const handleManualBalanceRefresh = useCallback(() => {
    if (!selectedToken || !account || balanceLoading) {
      return;
    }

    setIsBalanceRefreshing(true);
    dispatch(
      fetchBalance({
        tokenAddress: selectedToken.address,
        account,
        chainId: fromChainId,
        decimals: selectedToken.decimals,
      })
    ).finally(() => {
      setIsBalanceRefreshing(false);
    });
  }, [selectedToken, account, balanceLoading, fromChainId, dispatch]);

  useEffect(() => {
    if (!account || !selectedToken) {
      dispatch(clearGasCost());
      return;
    }

    const hasUsableAmount =
      !!amount && hasPositiveAmount(amount, selectedToken.decimals);

    const minForToken = (() => {
      const base = MIN_NATIVE_ETH_AMOUNT_WEI;
      const decimals = BigInt(selectedToken.decimals ?? 18);
      if (decimals === 18n) return base;
      if (decimals > 18n) {
        return base * 10n ** (decimals - 18n);
      }
      const divisor = 10n ** (18n - decimals);
      return base / divisor;
    })();

    const amountInWei = hasUsableAmount
      ? convertToWei(amount, selectedToken.decimals)
      : minForToken.toString();

    dispatch(
      fetchBridgeGasCost({
        tokenAddress: selectedToken.address,
        amount: amountInWei,
        receiver: account,
        chainId: fromChainId,
        userAddress: account,
      })
    );
  }, [
    account,
    selectedToken,
    amount,
    fromChainId,
    dispatch,
  ]);

  // Check if approval is needed when token or amount changes
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (
        selectedToken &&
        amount &&
        hasPositiveAmount(amount, selectedToken.decimals) &&
        account
      ) {
        try {
          if (selectedToken.address !== ZeroAddress) {
            const { bridgeManagerAddress } = initializeBridgeManager(fromChainId, selectedToken.address);
            const amountInWei = convertToWei(amount, selectedToken.decimals);

            const needsApproval = await checkTokenApproval(
              selectedToken.address,
              bridgeManagerAddress,
              amountInWei,
              fromChainId,
              account
            );

            dispatch(setNeedsApproval(needsApproval));
          } else {
            dispatch(setNeedsApproval(false));
          }
        } catch (error) {
          console.error('Error checking approval status:', error);
          dispatch(setNeedsApproval(false));
        }
      } else {
        dispatch(setNeedsApproval(false));
      }
    };

    checkApprovalStatus();
  }, [
    selectedToken,
    amount,
    account,
    fromChainId,
    dispatch,
  ]);

  const handleNetworkSwap = () => {
    dispatch(swapChains());
  };

  const handleAmountChange = (value: string) => {
    dispatch(setAmount(value));
  };

  const handleTokenSelect = (token: any) => {
    dispatch(setSelectedToken(token));
  };

  const handleBridge = async () => {
    if (
      !selectedToken ||
      !amount ||
      !hasPositiveAmount(amount, selectedToken.decimals)
    )
      return;

    if (!account) {
      console.error("No account connected");
      return;
    }

    dispatch(clearTransactionHash());

    dispatch(
      bridgeTokens({
        fromChainId,
        toChainId,
        token: selectedToken,
        amount,
        userAddress: account,
      })
    );
  };

  const getNetworkName = (chainId: number): 'ETH' | 'PLS' => {
    return chainId === 1 ? 'ETH' : 'PLS';
  };

  const getCorrespondingToken = (
    token: BridgeToken | null,
    targetChainId: number
  ): BridgeToken | null => {
    if (!token || !tokenPairs.length) return null;

    const pair = tokenPairs.find(
      (pair) =>
        pair.from.chainId === token.chainId &&
        pair.from.address.toLowerCase() === token.address.toLowerCase() &&
        pair.to.chainId === targetChainId
    );

    return pair ? pair.to : null;
  };

  const correspondingToken = getCorrespondingToken(selectedToken, toChainId);

  const {
    ethFloat,
    isOnEthereum,
    loading: ethBalanceLoading,
    error: ethBalanceError,
  } = useEthBalance();
  const [onrampOpen, setOnrampOpen] = useState(false);
  const gasEstimateEth = useMemo(() => {
    if (!gasCostWei) {
      return null;
    }
    try {
      const wei = BigInt(gasCostWei);
      return Number(formatEther(wei));
    } catch {
      return null;
    }
  }, [gasCostWei]);

  const recommendedEthThreshold = useMemo(() => {
    const fallback = 0.02;
    if (gasEstimateEth == null) {
      return fallback;
    }
    return Math.max(gasEstimateEth, 0.002);
  }, [gasEstimateEth]);

  const shouldRenderOnRamp = useMemo(() => {
    if (!isOnEthereum) return false;
    if (gasEstimateEth === null) return false;
    if (ethBalanceLoading) return false;
    if (ethBalanceError) return false;
    if (ethFloat == null) return false;
    return true;
  }, [isOnEthereum, gasEstimateEth, ethBalanceLoading, ethBalanceError, ethFloat]);

  return (
    <div className="relative flex flex-col items-center bg-bg-page px-4 pt-2 pb-0 text-text sm:px-6 sm:pb-10 lg:px-8">
      <div className="relative z-10 mx-auto w-full max-w-4xl pb-2 sm:pb-6">
        <div className="w-full rounded-3xl border border-border bg-bg-surface p-4 shadow-floating sm:p-8 lg:p-10">
          <BridgeHeader />

          {/* On-Ramp suggestion (only when on Ethereum with low ETH) */}
          {shouldRenderOnRamp && (
            <OnRampBanner
              currentEth={ethFloat}
              thresholdEth={recommendedEthThreshold}
              estimatedEth={gasEstimateEth}
              loading={gasCostLoading}
              onClickBuy={() => setOnrampOpen(true)}
            />
          )}

          <div className="mt-2 sm:mt-8">
            <BridgeCard
              fromNetwork={getNetworkName(fromChainId)}
              toNetwork={getNetworkName(toChainId)}
              fromChainId={fromChainId}
              toChainId={toChainId}
              amount={amount}
              selectedToken={selectedToken?.symbol || ""}
              correspondingToken={correspondingToken}
              onNetworkSwap={handleNetworkSwap}
              onAmountChange={handleAmountChange}
              onTokenSelect={handleTokenSelect}
              tokens={tokens}
              loading={loading}
              error={error}
              isBridging={isBridging}
              onBridge={handleBridge}
              estimate={estimate}
              estimateLoading={estimateLoading}
              estimateError={estimateError}
              balance={balance}
              balanceLoading={balanceLoading}
              balanceError={balanceError}
              onRefreshBalance={handleManualBalanceRefresh}
              isRefreshingBalance={isBalanceRefreshing}
              transactionHash={transactionHash}
              isApproving={isApproving}
              approvalTxHash={approvalTxHash}
              needsApproval={needsApproval}
              bridgeTransaction={bridgeTransaction}
              bridgeTransactionLoading={bridgeTransactionLoading}
              bridgeTransactionError={bridgeTransactionError}
            />
          </div>

          <OnRampModal
            open={onrampOpen}
            onClose={() => setOnrampOpen(false)}
            address={account}
          />
        </div>
      </div>
    </div>
  );
};

export default Bridge;
