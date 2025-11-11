import { AnimatePresence, motion } from "framer-motion";
import { TokenType } from "../../types/Swap";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setFromToken, setToToken, getTokenBalancesBatch } from "../../store/swapSlice";
import useWallet from "../../hooks/useWallet";
import { useEffect, useMemo } from "react";

interface TokenPopupProps {
  isOpen: boolean;
  onClose: () => void;
  chain: TokenType | null;
  setChain: (chain: TokenType) => void;
  selectType: "from" | "to" | null;
  searchChain: string;
  setSearchChain: (searchChain: string) => void;
  searchToken: string;
  setSearchToken: (searchToken: string) => void;
  availableTokens: TokenType[];
}

const TokenPopup = ({
  isOpen,
  onClose,
  chain,
  setChain,
  selectType,
  searchChain,
  setSearchChain,
  searchToken,
  setSearchToken,
  availableTokens,
}: TokenPopupProps) => {
  const { allChains, tokenBalances, isTokenBalancesLoading } = useAppSelector((state) => state.swap);
  const { account } = useWallet();
  const dispatch = useAppDispatch();

  const handleSetToken = (token: TokenType) => {
    if (selectType === "from") {
      dispatch(setFromToken(token));
    } else {
      dispatch(setToToken(token));
    }
  };

  // Filter for PulseChain tokens only
  const pulsechainTokens = useMemo(
    () =>
      availableTokens.filter(
        (token) =>
          token.blockchainNetwork?.toLowerCase() === "pulsechain" ||
          token.network?.toLowerCase() === "pulsechain" ||
          token.blockchainNetwork?.toLowerCase() === "pls" ||
          token.network?.toLowerCase() === "pls"
      ),
    [availableTokens]
  );


  // Fetch token balances when popup opens and account is available
  useEffect(() => {
    if (isOpen && account && pulsechainTokens.length > 0) {
      dispatch(getTokenBalancesBatch({ tokens: pulsechainTokens, account }));
    }
  }, [isOpen, account]);

  // Helper function to format balance
  const formatBalance = (balance: number): string => {
    if (balance === 0) return "0";
    if (balance < 0.0001) return "<0.0001";
    if (balance < 1) return balance.toFixed(4);
    if (balance < 1000) return balance.toFixed(2);
    if (balance < 1000000) return (balance / 1000).toFixed(2) + "K";
    return (balance / 1000000).toFixed(2) + "M";
  };

  // Get balance for a token (returns null if not loaded yet)
  const getTokenBalance = (token: TokenType): number | null => {
    const tokenAddress = token.address.toLowerCase();
    // If loading and balance not in map, return null to show spinner
    if (isTokenBalancesLoading && !(tokenAddress in tokenBalances)) {
      return null;
    }
    return tokenBalances[tokenAddress] ?? 0;
  };

  // Filter and sort tokens: tokens with balance first, then empty tokens
  const sortedAndFilteredTokens = useMemo(() => {
    // Then sort: tokens with balance > 0 first, then tokens with balance = 0
    return [...pulsechainTokens].sort((a, b) => {
      const addressA = a.address.toLowerCase();
      const addressB = b.address.toLowerCase();
      
      // Get balances (null if loading and not in map)
      const balanceA = (isTokenBalancesLoading && !(addressA in tokenBalances))
        ? null
        : (tokenBalances[addressA] ?? 0);
      const balanceB = (isTokenBalancesLoading && !(addressB in tokenBalances))
        ? null
        : (tokenBalances[addressB] ?? 0);
      
      // If either is loading (null), put it at the end
      if (balanceA === null && balanceB === null) return 0;
      if (balanceA === null) return 1;
      if (balanceB === null) return -1;
      
      // If both have balance or both are zero, maintain original order
      if ((balanceA > 0 && balanceB > 0) || (balanceA === 0 && balanceB === 0)) {
        return 0;
      }
      
      // Tokens with balance come first
      return balanceB > balanceA ? 1 : -1;
    });
  }, [pulsechainTokens, tokenBalances, isTokenBalancesLoading]);

  // Filter for PulseChain chains only
  const pulsechainChains = allChains.filter(
    (tempChain) =>
      (tempChain.type === "NATIVE_ETH" || tempChain.type === "NATIVE") &&
      (tempChain.network?.toLowerCase() === "pulsechain" ||
       tempChain.network?.toLowerCase() === "pls" ||
       tempChain.blockchainNetwork?.toLowerCase() === "pulsechain" ||
       tempChain.blockchainNetwork?.toLowerCase() === "pls")
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl rounded-xl border border-border bg-bg-surface shadow-floating max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-3 sm:p-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold text-text">
                Select Token
              </h2>
              <button
                onClick={onClose}
                className="text-text-subtle hover:text-text transition-colors p-1"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto max-h-[calc(90vh-80px)]">

              <div className="flex flex-col sm:flex-row gap-3 mt-3">
                {/* Chains Panel */}
                <div className="w-full sm:w-[200px] hidden">
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Search chains"
                      className="w-full rounded-lg border border-border bg-bg-page px-3 py-2 pl-8 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      value={searchChain}
                      onChange={(e) => setSearchChain(e.target.value)}
                    />
                    <svg
                      className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 transform -translate-y-1/2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    {searchChain && (
                      <button
                        type="button"
                        aria-label="Clear chain search"
                        onClick={() => setSearchChain("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-primary-050/60 focus:outline-none"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-[200px] sm:max-h-[310px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex items-center justify-center text-xs sm:text-sm text-text-subtle">
                      PulseChain Network
                    </div>
                    <hr className="border-border" />
                    {pulsechainChains
                      .filter(
                        (tempChain) =>
                          tempChain.network
                            .toLowerCase()
                            .includes(searchChain.toLowerCase())
                      )
                      .map((tempChain, index) => (
                        <button
                          key={index}
                          className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs transition-colors sm:text-sm ${
                            chain?.blockchainNetwork === tempChain.blockchainNetwork
                              ? "bg-primary-050 text-primary font-semibold"
                              : "text-text hover:bg-primary-050/40"
                          }`}
                          onClick={() => setChain(tempChain)}
                        >
                          <img
                            src={tempChain.image}
                            alt={tempChain.symbol}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full mr-2"
                          />
                          <span className="truncate">{tempChain.network}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Tokens Panel */}
                <div className="flex-1">
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Search tokens"
                      value={searchToken}
                      onChange={(e) => setSearchToken(e.target.value)}
                      className="w-full rounded-lg border border-border bg-bg-page px-3 py-2 pl-8 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                    <svg
                      className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 transform -translate-y-1/2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <button
                      type="button"
                      aria-label="Clear token search"
                      onClick={() => setSearchToken("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-primary-050/60 focus:outline-none"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-[200px] sm:max-h-[320px] overflow-y-auto custom-scrollbar">
                    {sortedAndFilteredTokens.length > 0
                      ? sortedAndFilteredTokens.map((token, index) => (
                          <motion.button
                            key={index}
                            className="flex w-full items-center gap-3 rounded-lg border border-border bg-bg-page px-3 py-2 transition-colors hover:border-primary hover:bg-primary-050/60 sm:px-4"
                            onClick={() => {
                              handleSetToken(token);
                              onClose();
                            }}
                          >
                            <div className="flex-shrink-0 rounded-full text-xl">
                              <img
                                src={token.image}
                                alt={token.symbol}
                                className="h-8 w-8 rounded-full object-cover sm:h-10 sm:w-10"
                              />
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <div className="truncate text-sm font-semibold text-text">
                                {token.symbol}
                              </div>
                              <div className="truncate text-xs text-text-muted">
                                {token.name}
                              </div>
                            </div>
                                <div className="flex-shrink-0 text-right">
                                  {isTokenBalancesLoading ? (
                                    <div className="flex items-center justify-end">
                                      <svg
                                        className="animate-spin h-4 w-4 text-text-subtle"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        ></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                      </svg>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="text-sm font-medium text-text">
                                        {formatBalance(getTokenBalance(token) ?? 0)}
                                      </div>
                                      <div className="text-xs text-text-subtle">
                                        {token.symbol}
                                      </div>
                                    </>
                                  )}
                                </div>
                          </motion.button>
                        ))
                      : Array.from({ length: 10 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-8 w-full rounded-lg border border-border bg-bg-page sm:h-10"
                          ></div>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TokenPopup;
