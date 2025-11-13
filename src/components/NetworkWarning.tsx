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
    const path = location.pathname;
    if (path.startsWith("/bridge")) {
      return "ethereum"; // Bridge requires Ethereum as source
    }
    if (path === "/" || path.startsWith("/swap")) {
      return "pulsechain"; // Swap requires PulseChain
    }
    if (path.startsWith("/referrals")) {
      return "pulsechain"; // Referral dashboard requires PulseChain
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 rounded-xl border border-danger bg-danger/10 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/20">
            <svg className="w-5 h-5 text-danger" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-danger font-semibold text-sm">
              Wrong Network Detected
            </h3>
            <p className="text-text-muted text-xs">
              This page requires {getRequiredNetworkName()} network
            </p>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSwitchNetwork}
          className="flex items-center space-x-2 rounded-lg border border-danger px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/15"
        >
          
          <span className="text-danger font-medium text-sm">
            Switch to {getRequiredNetworkName()}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default NetworkWarning; 


