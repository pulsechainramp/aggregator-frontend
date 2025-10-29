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
  const { account, wallet, switchToChain, connectWallet } = useWallet();
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
    if (wallet?.provider && (wallet.provider as any).on) {
      const handleChainChanged = (chainId: string) => {
        setCurrentChainId(parseInt(chainId, 16));
      };

      (wallet.provider as any).on("chainChanged", handleChainChanged);

      return () => {
        if ((wallet.provider as any).removeListener) {
          (wallet.provider as any).removeListener("chainChanged", handleChainChanged);
        }
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
    if (!account) return false;

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

  const isConnect = getButtonText() === "Connect Wallet";

  return (
    <div>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        disabled={isDisabled()}
        onClick={async () => {
          if (isConnect) {
            try {
              await connectWallet();
            } catch (e) {
              console.error("Failed to connect wallet:", e);
            }
            return;
          }

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
        className={`mt-6 w-full rounded-xl border py-4 text-lg font-semibold transition-colors ${
          isDisabled()
            ? "cursor-not-allowed border-border bg-bg-page text-text-muted"
            : isConnect || (account && !isOnPulseChain())
            ? "border-primary bg-primary-050 text-primary hover:border-primary-600 hover:bg-primary-050/80"
            : "bg-primary text-white hover:bg-primary-600"
        }`}
      >
        {getButtonText()}
      </motion.button>
    </div>
  );
};

export default SwapButton;