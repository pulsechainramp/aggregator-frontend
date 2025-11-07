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
      return 'https://api-assets.rubic.exchange/assets/rubic/eth/0x0000000000000000000000000000000000000000/logo_9LYU9u5.png';
    }
    if (token.symbol === 'PLS' && token.address === '0x0000000000000000000000000000000000000000') {
      return 'https://api-assets.rubic.exchange/assets/coingecko/pulsechain/0x0000000000000000000000000000000000000000/logo.png';
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
        className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-surface p-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary-050/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          {selectedTokenData ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-primary-050 text-primary overflow-hidden">
                {getNetworkLogo(selectedTokenData) ? (
                  <img 
                    src={getNetworkLogo(selectedTokenData)} 
                    alt={selectedTokenData.symbol}
                    className="h-6 w-6 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span className={`text-sm font-semibold ${getNetworkLogo(selectedTokenData) ? 'hidden' : ''}`}>
                  {selectedTokenData.symbol}
                </span>
              </div>
              <div className="text-left">
                <FlowingText 
                  text={selectedTokenData.symbol} 
                  className="max-w-[120px] text-base font-semibold text-text"
                />
                <FlowingText 
                  text={selectedTokenData.name} 
                  className="max-w-[120px] text-sm text-text-muted"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-page">
                <span className="text-sm font-semibold text-text">?</span>
              </div>
              <div className="text-left">
                <div className="text-base font-semibold text-text">{loading ? "Loading..." : "Select Token"}</div>
                <div className="text-sm text-text-muted">{loading ? "Fetching tokens..." : "Choose a token"}</div>
              </div>
            </>
          )}
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-5 text-text-subtle"
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
            className="absolute top-full left-0 right-0 z-10 mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-bg-surface shadow-floating"
          >
            <div className="space-y-1 p-2">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-4 w-4 rounded-full border-2 border-border border-t-transparent animate-spin"></div>
                  <span className="ml-2 text-sm text-text-muted">Loading tokens...</span>
                </div>
              ) : tokens.length === 0 ? (
                <div className="py-4 text-center text-sm text-text-muted">
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
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                      selectedToken === token.symbol
                        ? 'border border-primary bg-primary-050 text-primary shadow-sm'
                        : 'border border-transparent text-text hover:border-primary hover:bg-primary-050/60'
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-primary-050 text-primary overflow-hidden">
                      {getNetworkLogo(token) ? (
                        <img 
                          src={getNetworkLogo(token)} 
                          alt={token.symbol}
                          className="h-5 w-5 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <span className={`text-xs font-semibold ${getNetworkLogo(token) ? 'hidden' : ''}`}>
                        {token.symbol}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <FlowingText 
                        text={token.symbol} 
                        className="max-w-[100px] text-sm font-semibold text-text"
                      />
                      <FlowingText 
                        text={token.name} 
                        className="max-w-[100px] text-xs text-text-muted"
                      />
                    </div>
                    {token.tags.includes('verified') && (
                      <div className="h-2 w-2 rounded-full bg-success"></div>
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
