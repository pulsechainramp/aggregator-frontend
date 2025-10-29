import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import { TokenType } from "../../../types/Swap";
import AmountInput from "./AmountInput";
import TokenSelector from "./TokenSelector";
import TokenSwapButton from "./TokenSwapButton";

import { addTokenToWallet, waitForChain, EIP1193Provider } from "../../../utils/walletUtils";
import useWallet from "../../../hooks/useWallet";
import { toast } from "react-toastify";

interface SwapCardProps {
  fromToken: TokenType | null;
  toToken: TokenType | null;
  allChains: TokenType[];
  fromAmount: string;
  outputAmount: number;
  onFromTokenSelect: () => void;
  onToTokenSelect: () => void;
  onFromAmountChange: (value: string) => void;
  onTokenSwap: () => void;
  isLoadingQuote: boolean;
  fromTokenBalance: string;
  toTokenBalance: string;
  nativeBalance: string;
}

const SwapCard: React.FC<SwapCardProps> = ({
  fromToken,
  toToken,
  allChains,
  fromAmount,
  outputAmount,
  onFromTokenSelect,
  onToTokenSelect,
  onFromAmountChange,
  onTokenSwap,
  isLoadingQuote,
  fromTokenBalance,
  toTokenBalance,
  nativeBalance,
}) => {
  const { wallet, switchToChain } = useWallet();
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

  const isOnPulseChain = () => {
    return currentChainId === 369;
  };

  const getCurrentNetworkName = () => {
    if (!currentChainId) return "Unknown";
    if (currentChainId === 1) return "Ethereum";
    if (currentChainId === 369) return "PulseChain";
    return `Chain ID ${currentChainId}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return "0";
    if (num < 0.0001) return "< 0.0001";
    return num.toFixed(4);
  };

  const getFromTokenBalance = () => {
    if (!fromToken) return "0";
    return fromToken.address === "0x0000000000000000000000000000000000000000"
      ? formatBalance(nativeBalance)
      : formatBalance(fromTokenBalance);
  };

  const getToTokenBalance = () => {
    if (!toToken) return "0";
    return toToken.address === "0x0000000000000000000000000000000000000000"
      ? formatBalance(nativeBalance)
      : formatBalance(toTokenBalance);
  };

  return (
    <motion.div className="relative flex flex-col gap-4 rounded-xl border border-border bg-bg-surface p-4 shadow-sm sm:p-6">
      {/* From Token Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <TokenSelector
            token={fromToken}
            allChains={allChains}
            type="from"
            onSelect={onFromTokenSelect}
          />
          {fromToken && (
            <div className="ml-1 text-xs text-text-muted">
              Balance: {getFromTokenBalance()} {fromToken.symbol}
            </div>
          )}
        </div>
        
        <div className="flex items-center">
          <AmountInput
            amount={fromAmount}
            token={fromToken}
            onAmountChange={onFromAmountChange}
            isOutput={false}
            balance={
              fromToken?.address ===
              "0x0000000000000000000000000000000000000000"
                ? nativeBalance
                : fromTokenBalance
            }
            balanceLoading={false}
            onCopyAddress={() => {
              if (fromToken?.address) {
                navigator.clipboard.writeText(fromToken.address);
                toast.success("Token address copied to clipboard");
              }
            }}
            onAddToWallet={async () => {
              if (!wallet || !fromToken) return;

              try {
                if (!isOnPulseChain()) {
                  await switchToChain(369);
                  try { await waitForChain(wallet.provider as unknown as EIP1193Provider, 369); } catch {}
                }

                const success = await addTokenToWallet(
                  {
                    address: fromToken.address,
                    symbol: fromToken.symbol,
                    decimals: fromToken.decimals,
                    chainId: 369,
                  },
                  { provider: wallet.provider as unknown as EIP1193Provider }
                );

                if (success) {
                  // Show success feedback
                }
              } catch (error) {
                console.error("Error adding token:", error);
              }
            }}
          />
        </div>
      </div>

      {/* Token Swap Button */}
      <div className="flex justify-center">
        <TokenSwapButton onSwap={onTokenSwap} />
      </div>

      {/* To Token Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <TokenSelector
            token={toToken}
            allChains={allChains}
            type="to"
            onSelect={onToTokenSelect}
          />
          {toToken && (
            <div className="ml-1 text-xs text-text-muted">
              Balance: {getToTokenBalance()} {toToken.symbol}
            </div>
          )}
        </div>
        
        <div className="flex items-center">
          <AmountInput
            amount={fromAmount}
            token={toToken}
            onAmountChange={onFromAmountChange}
            isOutput={true}
            outputAmount={outputAmount}
            isLoading={isLoadingQuote}
            balance={
              toToken?.address === "0x0000000000000000000000000000000000000000"
                ? nativeBalance
                : toTokenBalance
            }
            balanceLoading={false}
            onCopyAddress={() => {
              if (toToken?.address) {
                navigator.clipboard.writeText(toToken.address);
                toast.success("Token address copied to clipboard");
              }
            }}
            onAddToWallet={async () => {
              if (!wallet || !toToken) return;

              try {
                if (!isOnPulseChain()) {
                  await switchToChain(369);
                  try { await waitForChain(wallet.provider as unknown as EIP1193Provider, 369); } catch {}
                }

                const success = await addTokenToWallet(
                  {
                    address: toToken.address,
                    symbol: toToken.symbol,
                    decimals: toToken.decimals,
                    chainId: 369,
                  },
                  { provider: wallet.provider as unknown as EIP1193Provider }
                );

                if (success) {
                  // Show success feedback
                }
              } catch (error) {
                console.error("Error adding token:", error);
              }
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default SwapCard;
