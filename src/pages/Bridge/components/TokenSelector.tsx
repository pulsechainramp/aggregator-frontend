import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BridgeToken } from '../../../store/bridgeSlice';

interface TokenSelectorProps {
  selectedToken: string;
  onTokenSelect: (token: BridgeToken) => void;
  network: 'ETH' | 'PLS';
  tokens: BridgeToken[];
  loading: boolean;
}

// Flowing text component for long text
const FlowingText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [animationDistance, setAnimationDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const checkOverflow = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = containerRef.current.scrollWidth;
      const isTextOverflowing = textWidth > containerWidth;
      setIsOverflowing(isTextOverflowing);
      
      if (isTextOverflowing) {
        // Calculate the distance needed to show the full text
        setAnimationDistance(textWidth - containerWidth + 20); // Add 20px padding
      }
    }
  };
  
  useEffect(() => {
    checkOverflow();
  }, [text]);
  
  return (
    <div 
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      onMouseEnter={() => isOverflowing && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="whitespace-nowrap inline-block"
        animate={isHovered && isOverflowing ? { x: [0, -animationDistance, 0] } : { x: 0 }}
        transition={{ 
          duration: isOverflowing ? 6 : 0, 
          repeat: isHovered && isOverflowing ? Infinity : 0,
          ease: "linear",
          delay: isHovered ? 0.5 : 0
        }}
      >
        {text}
      </motion.div>
    </div>
  );
};

const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onTokenSelect,
  network,
  tokens,
  loading,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getNetworkLogo = (token: BridgeToken): string | undefined => {
    // Use actual network logos for native tokens
    if (token.symbol === 'ETH' && token.address === '0x0000000000000000000000000000000000000000') {
      return 'http://api-assets.rubic.exchange/assets/rubic/eth/0x0000000000000000000000000000000000000000/logo_9LYU9u5.png';
    }
    if (token.symbol === 'PLS' && token.address === '0x0000000000000000000000000000000000000000') {
      return 'http://api-assets.rubic.exchange/assets/coingecko/pulsechain/0x0000000000000000000000000000000000000000/logo.png';
    }
    return token.logoURI;
  };

  const selectedTokenData = tokens.find(token => token.symbol === selectedToken);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-[#2b2e4a] to-[#1e2030] rounded-xl hover:from-[#3a3f5a] hover:to-[#2b2e4a] transition-all duration-200 border border-[#3a3f5a] hover:border-[#4a4f6a] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center space-x-3">
          {selectedTokenData ? (
            <>
              <div className={`w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden`}>
                {getNetworkLogo(selectedTokenData) ? (
                  <img 
                    src={getNetworkLogo(selectedTokenData)} 
                    alt={selectedTokenData.symbol}
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span className={`text-white font-bold text-sm ${getNetworkLogo(selectedTokenData) ? 'hidden' : ''}`}>
                  {selectedTokenData.symbol}
                </span>
              </div>
              <div className="text-left">
                <FlowingText 
                  text={selectedTokenData.symbol} 
                  className="text-white font-semibold text-base max-w-[120px]"
                />
                <FlowingText 
                  text={selectedTokenData.name} 
                  className="text-gray-400 text-sm max-w-[120px]"
                />
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">?</span>
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-base">{loading ? "Loading..." : "Select Token"}</div>
                <div className="text-gray-400 text-sm">{loading ? "Fetching tokens..." : "Choose a token"}</div>
              </div>
            </>
          )}
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-[#1e2030] to-[#2b2e4a] rounded-xl border border-[#3a3f5a] shadow-2xl z-10 backdrop-blur-sm max-h-60 overflow-y-auto"
          >
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-400 text-sm">Loading tokens...</span>
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No tokens available
                </div>
              ) : (
                tokens.map((token, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onTokenSelect(token);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      selectedToken === token.symbol
                        ? 'bg-gradient-to-r from-[#3a3f5a] to-[#2b2e4a] text-white shadow-lg'
                        : 'hover:bg-[#2b2e4a] text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden`}>
                      {getNetworkLogo(token) ? (
                        <img 
                          src={getNetworkLogo(token)} 
                          alt={token.symbol}
                          className="w-5 h-5 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <span className={`text-white font-bold text-xs ${getNetworkLogo(token) ? 'hidden' : ''}`}>
                        {token.symbol}
                      </span>
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <FlowingText 
                        text={token.symbol} 
                        className="font-semibold text-sm max-w-[100px]"
                      />
                      <FlowingText 
                        text={token.name} 
                        className="text-gray-400 text-xs max-w-[100px]"
                      />
                    </div>
                    {token.tags.includes('verified') && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    )}
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TokenSelector; 