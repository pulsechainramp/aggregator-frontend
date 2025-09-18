import React, { useState } from "react";
import { motion } from "framer-motion";
import useWallet from "../hooks/useWallet";

interface NetworkIndicatorProps {
  className?: string;
}

const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({ className = "" }) => {
  const { 
    currentChainId, 
    getCurrentNetworkName, 
    getCurrentNetworkSymbol,
    isOnEthereum,
    isOnPulseChain,
    switchToPulsechain,
    switchToEthereum,
    wallet
  } = useWallet();
  
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  if (!wallet || !currentChainId) {
    return null;
  }

  const getNetworkColor = () => {
    if (isOnEthereum()) return "from-blue-500 to-blue-600";
    if (isOnPulseChain()) return "from-emerald-500 to-teal-500";
    return "from-gray-500 to-gray-600";
  };

  const getNetworkIcon = () => {
    if (isOnEthereum()) return "🔵";
    if (isOnPulseChain()) return "🟢";
    return "❓";
  };

  const handleSwitchToPulseChain = async () => {
    try {
      await switchToPulsechain();
      setShowSwitchMenu(false);
    } catch (error) {
      console.error("Failed to switch to PulseChain:", error);
    }
  };

  const handleSwitchToEthereum = async () => {
    try {
      await switchToEthereum();
      setShowSwitchMenu(false);
    } catch (error) {
      console.error("Failed to switch to Ethereum:", error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onMouseEnter={() => setShowSwitchMenu(true)}
        onMouseLeave={() => setShowSwitchMenu(false)}
        className={`bg-gradient-to-r ${getNetworkColor()} px-3 py-1.5 rounded-lg border border-transparent shadow-lg transition-all duration-200 flex items-center space-x-2`}
      >
        <span className="text-white text-sm font-medium">
          {getNetworkIcon()}
        </span>
        <span className="text-white text-sm font-semibold">
          {getCurrentNetworkSymbol()}
        </span>
        <svg 
          className="w-3 h-3 text-white/70" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </motion.button>

      {/* Network Switch Menu */}
      {showSwitchMenu && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute top-full right-0 mt-2 w-48 bg-[#1e2030] border border-[#3a3f5a] rounded-xl shadow-xl z-50 overflow-hidden"
        >
          <div className="p-2">
            <div className="px-3 py-2 text-xs text-gray-400 font-medium border-b border-[#3a3f5a] mb-2">
              Switch Network
            </div>
            
            {/* Ethereum Option */}
            <button
              onClick={handleSwitchToEthereum}
              disabled={isOnEthereum()}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isOnEthereum()
                  ? 'bg-blue-500/20 border border-blue-500/30 cursor-not-allowed'
                  : 'hover:bg-blue-500/10 hover:border-blue-500/20 border border-transparent'
              }`}
            >
              <span className="text-lg">🔵</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white">Ethereum</div>
                <div className="text-xs text-gray-400">ETH</div>
              </div>
              {isOnEthereum() && (
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* PulseChain Option */}
            <button
              onClick={handleSwitchToPulseChain}
              disabled={isOnPulseChain()}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isOnPulseChain()
                  ? 'bg-emerald-500/20 border border-emerald-500/30 cursor-not-allowed'
                  : 'hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-transparent'
              }`}
            >
              <span className="text-lg">🟢</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white">PulseChain</div>
                <div className="text-xs text-gray-400">PLS</div>
              </div>
              {isOnPulseChain() && (
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default NetworkIndicator; 