import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { addTokenToWallet, TokenInfo } from "../utils/walletUtils";
import useWallet from "../hooks/useWallet";

interface AddToWalletButtonProps {
  token: TokenInfo;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

const AddToWalletButton: React.FC<AddToWalletButtonProps> = ({
  token,
  className = "",
  variant = "primary",
  size = "md",
}) => {
  const { wallet, switchToChain } = useWallet();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

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

  // Check if user is on the correct network for the token
  const isOnCorrectNetwork = () => {
    if (!currentChainId) return false;
    return currentChainId === token.chainId;
  };

  // Get current network name
  const getCurrentNetworkName = () => {
    if (!currentChainId) return "Unknown";
    if (currentChainId === 1) return "Ethereum";
    if (currentChainId === 369) return "PulseChain";
    return `Chain ID ${currentChainId}`;
  };

  // Get required network name
  const getRequiredNetworkName = () => {
    if (token.chainId === 1) return "Ethereum";
    if (token.chainId === 369) return "PulseChain";
    return `Chain ID ${token.chainId}`;
  };

  const handleAddToken = async () => {
    if (!wallet) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    setIsAdding(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      // Check if user is on the correct network
      if (!isOnCorrectNetwork()) {
        setIsSwitchingNetwork(true);

        // Switch to the correct network first
        await switchToChain(token.chainId);

        // Wait a moment for the network switch to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setIsSwitchingNetwork(false);
      }

      // Now add the token to the wallet
      const success = await addTokenToWallet(token, wallet);

      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
      }
    } catch (error) {
      console.error("Error adding token:", error);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsAdding(false);
      setIsSwitchingNetwork(false);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40";
      case "secondary":
        return "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40";
      case "outline":
        return "bg-transparent border-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white";
      default:
        return "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-3 py-2 text-sm";
      case "md":
        return "px-4 py-2 text-base";
      case "lg":
        return "px-6 py-3 text-lg";
      default:
        return "px-4 py-2 text-base";
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleAddToken}
        disabled={isAdding || isSwitchingNetwork}
        className={`
          ${getVariantClasses()}
          ${getSizeClasses()}
          rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        {isAdding || isSwitchingNetwork ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>
              {isSwitchingNetwork ? "Switching Network..." : "Adding..."}
            </span>
          </div>
        ) : !isOnCorrectNetwork() ? (
          <div className="flex items-center space-x-2">
            <img 
              src="/metamask.png" 
              alt="MetaMask" 
              className="w-4 h-4"
              />
            <span>
              Switch to {getRequiredNetworkName()} & Add {token.symbol}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <img 
              src="/metamask.png" 
              alt="MetaMask" 
              className="w-4 h-4"
              />
            <span>Add {token.symbol} to Wallet</span>
          </div>
        )}
      </motion.button>

      {/* Success Message */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-green-500 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap"
        >
          ✓ {token.symbol} added to wallet!
        </motion.div>
      )}

      {/* Error Message */}
      {showError && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-500 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap max-w-xs"
        >
          {!isOnCorrectNetwork()
            ? `Failed to switch to ${getRequiredNetworkName()}. Please try again.`
            : `Failed to add ${token.symbol}. Please try again.`}
        </motion.div>
      )}
    </div>
  );
};

export default AddToWalletButton;
