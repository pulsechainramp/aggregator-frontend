import React, { useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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

  const convertToWei = (amount: string, decimals: number): string => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return "0";
    return (amountNum * Math.pow(10, decimals)).toString();
  };

  // Fetch estimate when token, network, or amount changes
  useEffect(() => {
    if (selectedToken && amount && parseFloat(amount) > 0) {
      const amountInWei = convertToWei(amount, selectedToken.decimals);
      debouncedFetchEstimate(selectedToken.address, fromChainId, amountInWei);
    }
  }, [selectedToken, fromChainId, amount, debouncedFetchEstimate]);

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
      if (selectedToken && amount && parseFloat(amount) > 0 && account) {
        try {
          if (selectedToken.address !== "0x0000000000000000000000000000000000000000") {
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
  }, [selectedToken, amount, account, fromChainId, dispatch]);

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
    if (!selectedToken || !amount || parseFloat(amount) <= 0) return;

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="min-h-screen bg-gradient-to-br from-[#1a1c2c] via-[#1e2030] to-[#1a1c2c] text-white flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 font-['Red_Hat_Display'] relative overflow-hidden"
    >
      <div className="relative z-10 w-full max-w-4xl mx-auto pt-8 sm:pt-12 lg:pt-16 pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-gradient-to-br from-[#2b2e4a] to-[#1e2030] rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl border border-[#3a3f5a]/50 backdrop-blur-sm"
          >
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
              />
            </div>

            <OnRampModal
              open={onrampOpen}
              onClose={() => setOnrampOpen(false)}
              address={account}
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Bridge;
