import React, { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchTokenPairs,
  setSelectedToken,
  setAmount,
  swapChains,
  bridgeTokens,
  fetchBridgeEstimate,
  fetchBalance,
  clearTransactionHash,
  setNeedsApproval,
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
  } = useAppSelector((state) => state.bridge);
  const isSourceChainSupported = fromChainId === 1;
  const unsupportedBridgeMessage =
    "PulseBridge currently supports bridging from Ethereum to PulseChain only. Switch the source network to Ethereum to continue.";

  useEffect(() => {
    dispatch(fetchTokenPairs());
  }, [dispatch]);

  // Default bridge token: ETH (=> WETH on PulseChain)
  useEffect(() => {
    if (!selectedToken && tokens && tokens.length > 0) {
      // prefer ETH on Ethereum (chainId 1); fallback to WETH if needed
      const preferred = ["ETH", "WETH"];
      const def = preferred
        .map(sym => tokens.find(t => t.chainId === fromChainId && t.symbol === sym))
        .find(Boolean);

      if (def) {
        dispatch(setSelectedToken(def));
      }
    }
  }, [tokens, fromChainId, selectedToken, dispatch]);

  const debouncedFetchEstimate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (tokenAddress: string, networkId: number, amount: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          dispatch(fetchBridgeEstimate({ tokenAddress, networkId, amount }));
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
      !isSourceChainSupported ||
      !selectedToken ||
      !amount ||
      !hasPositiveAmount(amount, selectedToken.decimals)
    ) {
      return;
    }

    const amountInWei = convertToWei(amount, selectedToken.decimals);
    debouncedFetchEstimate(selectedToken.address, fromChainId, amountInWei);
  }, [
    selectedToken,
    fromChainId,
    amount,
    debouncedFetchEstimate,
    isSourceChainSupported,
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

  // Check if approval is needed when token or amount changes
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!isSourceChainSupported) {
        dispatch(setNeedsApproval(false));
        return;
      }

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
    isSourceChainSupported,
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

    if (!isSourceChainSupported) {
      console.error(
        "Bridge direction not supported. Switch source to Ethereum."
      );
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

  const getNetworkDisplayName = (chainId: number) => {
    return chainId === 1 ? "Ethereum" : "PulseChain";
  };

  const getCorrespondingToken = (selectedTokenSymbol: string, toChainId: number) => {
    if (!selectedToken || !tokenPairs.length || !selectedTokenSymbol) return "";
    
    const pair = tokenPairs.find(pair => 
      pair.from.symbol === selectedTokenSymbol || 
      pair.to.symbol === selectedTokenSymbol
    );
    
    if (!pair) {
      return selectedTokenSymbol;
    }
    
    const correspondingToken = toChainId === 1 ? pair.from.symbol : pair.to.symbol;
    return correspondingToken;
  };

  const correspondingToken = getCorrespondingToken(selectedToken?.symbol || "", toChainId);

  const { ethFloat, isOnEthereum } = useEthBalance();
  const [onrampOpen, setOnrampOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-center bg-bg-page px-4 pt-3 pb-10 text-text sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto w-full max-w-4xl pb-6">
        <div className="w-full rounded-3xl border border-border bg-bg-surface p-6 shadow-floating sm:p-8 lg:p-10">
            <BridgeHeader />

            {/* On-Ramp suggestion (only when on Ethereum with low ETH) */}
            {isOnEthereum && (
              <OnRampBanner
                currentEth={ethFloat}
                thresholdEth={0.02}
                onClickBuy={() => setOnrampOpen(true)}
              />
            )}

            <div className="mt-6 sm:mt-8">
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
                transactionHash={transactionHash}
                isApproving={isApproving}
                approvalTxHash={approvalTxHash}
                needsApproval={needsApproval}
                bridgeTransaction={bridgeTransaction}
                bridgeTransactionLoading={bridgeTransactionLoading}
                bridgeTransactionError={bridgeTransactionError}
                isSourceNetworkSupported={isSourceChainSupported}
                unsupportedReason={
                  isSourceChainSupported ? undefined : unsupportedBridgeMessage
                }
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
