import React from "react";
import { motion } from "framer-motion";
import useWallet from "../hooks/useWallet";
import { useLocation } from "react-router-dom";

const NetworkWarning: React.FC = () => {
  const { 
    currentChainId, 
    isOnEthereum,
    isOnPulseChain,
    switchToPulsechain,
    switchToEthereum,
    wallet
  } = useWallet();
  const location = useLocation();

  if (!wallet || !currentChainId) {
    return null;
  }

  // Determine what network is required for current page
  const getRequiredNetwork = () => {
    if (location.pathname === "/bridge") {
      return "ethereum"; // Bridge requires Ethereum as source
    }
    if (location.pathname === "/" || location.pathname === "/swap") {
      return "pulsechain"; // Swap requires PulseChain
    }
    return null; // Other pages don't have specific requirements
  };

  const requiredNetwork = getRequiredNetwork();
  if (!requiredNetwork) return null;

  const isOnWrongNetwork = () => {
    if (requiredNetwork === "ethereum" && !isOnEthereum()) return true;
    if (requiredNetwork === "pulsechain" && !isOnPulseChain()) return true;
    return false;
  };

  if (!isOnWrongNetwork()) return null;

  const handleSwitchNetwork = async () => {
    try {
      if (requiredNetwork === "pulsechain") {
        await switchToPulsechain();
      } else if (requiredNetwork === "ethereum") {
        await switchToEthereum();
      }
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  const getRequiredNetworkName = () => {
    return requiredNetwork === "pulsechain" ? "PulseChain" : "Ethereum";
  };

  const getRequiredNetworkIcon = () => {
    return requiredNetwork === "pulsechain" ? "🟢" : "🔵";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mx-4 mb-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-red-400 font-semibold text-sm">
              Wrong Network Detected
            </h3>
            <p className="text-red-300/80 text-xs">
              This page requires {getRequiredNetworkName()} network
            </p>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSwitchNetwork}
          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500/70 px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2"
        >
          <span className="text-sm">{getRequiredNetworkIcon()}</span>
          <span className="text-red-400 font-medium text-sm">
            Switch to {getRequiredNetworkName()}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default NetworkWarning; 