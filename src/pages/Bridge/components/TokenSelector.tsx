import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BridgeToken } from "../../../store/bridgeSlice";
import TokenIcon from "../../../components/TokenIcon";

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
  const selectorRef = useRef<HTMLDivElement>(null);
  const priorityOrder = useMemo(
    () => ["ETH", "USDC", "USDT", "DAI", "WBTC", "WETH"],
    []
  );
  const sortedTokens = useMemo(() => {
    const priorityIndex = new Map(priorityOrder.map((sym, idx) => [sym, idx]));
    return [...tokens].sort((a, b) => {
      const aPriority = priorityIndex.has(a.symbol)
        ? priorityIndex.get(a.symbol)!
        : priorityOrder.length;
      const bPriority = priorityIndex.has(b.symbol)
        ? priorityIndex.get(b.symbol)!
        : priorityOrder.length;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [tokens, priorityOrder]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (selectorRef.current && target && !selectorRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const getNetworkLogo = (token: BridgeToken): string | undefined => {
    if (token.logoURI) {
      return token.logoURI;
    }
    if (token.symbol === 'ETH' && token.address === '0x0000000000000000000000000000000000000000') {
      return '/token-logos/eth/0x0000000000000000000000000000000000000000.png';
    }
    if (token.symbol === 'PLS' && token.address === '0x0000000000000000000000000000000000000000') {
      return '/token-logos/pulsex/369/0x0000000000000000000000000000000000000000.png';
    }
    return undefined;
  };

  const selectedTokenData = tokens.find(token => token.symbol === selectedToken);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
      ref={selectorRef}
    >
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-surface px-4 py-2 sm:py-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary-050/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          {selectedTokenData ? (
            <>
              <TokenIcon
                token={{
                  symbol: selectedTokenData.symbol,
                  logoURI: getNetworkLogo(selectedTokenData),
                  image: getNetworkLogo(selectedTokenData),
                }}
                size={40}
              />
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
                sortedTokens.map((token, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onTokenSelect(token);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${selectedToken === token.symbol
                        ? 'border border-primary bg-primary-050 text-primary shadow-sm'
                        : 'border border-transparent text-text hover:border-primary hover:bg-primary-050/60'
                      }`}
                  >
                    <TokenIcon
                      token={{
                        symbol: token.symbol,
                        logoURI: getNetworkLogo(token),
                        image: getNetworkLogo(token),
                      }}
                      size={32}
                    />
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
                    {token.tags?.includes('verified') && (
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
