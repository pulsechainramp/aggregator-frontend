import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import { ZeroAddress } from "../../../const/swap";
import { TokenType } from "../../../types/Swap";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { useAppSelector } from "../../../store/hooks";
import useWallet from "../../../hooks/useWallet";

interface SwapButtonProps {
  fromToken: TokenType | null;
  toToken: TokenType | null;
  fromAmount: string;
  outputAmount: number;
  quote: any;
  onSwap: () => void;
  hasSufficientBalance: boolean;
}

const SwapButton: React.FC<SwapButtonProps> = ({
  fromToken,
  toToken,
  fromAmount,
  outputAmount,
  quote,
  onSwap,
  hasSufficientBalance,
}) => {
  const { account, wallet, switchToChain } = useWallet();
  const { isSwapping, isApproved, isApproving } = useAppSelector(
    (state) => state.swap
  );
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);

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

  // Check if user is on PulseChain (required for swap)
  const isOnPulseChain = () => {
    return currentChainId === 369;
  };
  const getButtonText = () => {
    if (isSwapping || isApproving) {
      return "Processing...";
    }
    if (
      fromToken &&
      toToken &&
      (fromToken.blockchainNetwork !== "pulsechain" ||
        toToken.blockchainNetwork !== "pulsechain")
    ) {
      return "Only Pulsechain is supported";
    }
    if (!account) {
      return "Connect Wallet";
    }
    if (
      fromToken &&
      toToken &&
      Number(fromAmount) > 0 &&
      !hasSufficientBalance
    ) {
      return "Insufficient Balance";
    }
    if (account && !isOnPulseChain()) {
      return "Switch to PulseChain";
    }
    if (fromToken && toToken && Number(fromAmount) > 0 && quote?.calldata) {
      return fromToken.address !== ZeroAddress
        ? isApproved
          ? "Swap"
          : "Approve Token"
        : "Swap";
    }
    if (fromToken && toToken && Number(fromAmount) > 0) {
      return "Waiting for quote...";
    }
    if (fromToken && toToken) {
      return "Enter an Amount";
    }
    return "Select Tokens";
  };

  const isDisabled = () => {
    // If user is on wrong network, only disable for basic requirements
    if (account && !isOnPulseChain()) {
      return false;
    }

    // If user is on correct network, apply all validation
    return (
      !fromToken ||
      !toToken ||
      fromToken.blockchainNetwork !== "pulsechain" ||
      toToken.blockchainNetwork !== "pulsechain" ||
      (fromAmount ? Number(fromAmount) <= 0 : true) ||
      Number(outputAmount) <= 0 ||
      !quote?.calldata ||
      isSwapping ||
      isApproving ||
      !hasSufficientBalance
    );
  };

  return (
    <div>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        disabled={isDisabled()}
        onClick={async () => {
          if (account && !isOnPulseChain()) {
            // If user is on wrong network, switch to PulseChain
            try {
              await switchToChain(369); // PulseChain
            } catch (error) {
              console.error("Failed to switch to PulseChain:", error);
            }
          } else {
            // Otherwise, proceed with normal swap action
            onSwap();
          }
        }}
        className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
          isDisabled()
            ? "bg-gray-100/10 border-2 border-gray-400/30 text-gray-300 cursor-not-allowed hover:bg-gray-100/15"
            : account && !isOnPulseChain()
            ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
        }`}
      >
        {getButtonText()}
      </motion.button>
    </div>
  );
};

export default SwapButton;
