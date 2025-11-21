import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useRef } from "react";
import TokenIcon from "../../components/TokenIcon";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  clearTokenBalances,
  getTokenBalancesBatch,
  setFromToken,
  setToToken,
} from "../../store/swapSlice";
import { TokenType } from "../../types/Swap";
import useWallet from "../../hooks/useWallet";
import {
  filterAndSortTokensByBalance,
  formatBalanceDisplay,
} from "../../utils/tokenSort";

interface TokenPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectType: "from" | "to" | null;
  searchToken: string;
  setSearchToken: (search: string) => void;
  tokens: TokenType[];
  allTokens?: TokenType[];
  coreTokens?: TokenType[];
  isLoading?: boolean;
}

const TokenPopup: React.FC<TokenPopupProps> = ({
  isOpen,
  onClose,
  selectType,
  searchToken,
  setSearchToken,
  tokens,
  allTokens = tokens,
  coreTokens = [],
  isLoading = false,
}) => {
  const dispatch = useAppDispatch();
  const { tokenBalances, isTokenBalancesLoading } = useAppSelector(
    (state) => state.swap
  );
  const { account, currentChainId } = useWallet();
  const previousAccount = useRef<string | null>(null);
  const normalizedSearch = searchToken.trim().toLowerCase();

  const coreSymbolSet = useMemo(
    () =>
      new Set(
        coreTokens
          .map((token) => token.symbol?.toUpperCase() ?? "")
          .filter(Boolean)
      ),
    [coreTokens]
  );
  const corePriority = useMemo(
    () => ["PLS", "PLSX", "HEX", "INC", "WETH", "WBTC", "USDC", "USDT", "DAI"],
    []
  );

  const pulseTokens = useMemo(
    () =>
      allTokens.filter(
        (t) =>
          t.chainId === 369 ||
          t.blockchainNetwork?.toLowerCase() === "pulsechain" ||
          t.network?.toLowerCase() === "pulsechain"
      ),
    [allTokens]
  );

  const sourceTokens = useMemo(
    () => (normalizedSearch.length > 0 ? pulseTokens : tokens),
    [pulseTokens, tokens, normalizedSearch]
  );

  const quickCoreTokens = useMemo(() => {
    const coreOrder = ["PLS", "PLSX", "HEX", "INC", "WETH", "WBTC", "USDC", "USDT", "DAI"];
    const tokenPool = [
      ...coreTokens,
      ...pulseTokens.filter(
        (t) =>
          t.chainId === 369 ||
          t.blockchainNetwork?.toLowerCase() === "pulsechain" ||
          t.network?.toLowerCase() === "pulsechain"
      ),
    ];
    return coreOrder
      .map((symbol) => tokenPool.find((t) => t.symbol === symbol))
      .filter(
        (token, idx, arr) =>
          token && arr.findIndex((t) => t?.address === token.address) === idx
      ) as TokenType[];
  }, [coreTokens, allTokens]);

  useEffect(() => {
    if (!account) {
      dispatch(clearTokenBalances());
      return;
    }

    if (currentChainId && currentChainId !== 369) {
      return;
    }

    if (isOpen && sourceTokens.length > 0) {
      dispatch(getTokenBalancesBatch({ tokens: sourceTokens, account }));
    }
  }, [dispatch, account, isOpen, sourceTokens, currentChainId]);

  useEffect(() => {
    if (previousAccount.current && previousAccount.current !== account) {
      dispatch(clearTokenBalances());
    }
    previousAccount.current = account ?? null;
  }, [account, dispatch]);

  useEffect(() => {
    // Clear balances when switching away from PulseChain to avoid stale displays
    if (currentChainId && currentChainId !== 369) {
      dispatch(clearTokenBalances());
    }
  }, [currentChainId, dispatch]);

  const filteredTokens = useMemo(
    () =>
      filterAndSortTokensByBalance({
        tokens: sourceTokens,
        searchTerm: searchToken,
        balances: tokenBalances,
        coreSymbols: coreSymbolSet,
        corePriority,
      }),
    [sourceTokens, searchToken, tokenBalances, coreSymbolSet, corePriority]
  );

  const originBadge = (token: TokenType) => {
    // Prefork tokens keep a badge; native/bridged labels are hidden per requirements
    if (token.origin === "prefork") {
      return { label: "Prefork", className: "bg-warning/10 text-warning" };
    }
    return undefined;
  };

  const handleSetToken = (token: TokenType) => {
    if (selectType === "from") {
      dispatch(setFromToken(token));
    } else if (selectType === "to") {
      dispatch(setToToken(token));
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-2 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl rounded-xl border border-border bg-bg-surface shadow-floating"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg font-semibold text-text">Select Token</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-text-subtle transition-colors hover:text-text"
              >
                <svg
                  className="h-5 w-5"
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

            <div className="p-4">
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search name or address"
                    className="w-full rounded-lg border border-border bg-bg-page px-4 py-2 pl-10 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={searchToken}
                    onChange={(event) => setSearchToken(event.target.value)}
                  />
                  <svg
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
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
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  Sorted by your balance, then core tokens. Only verified tokens are listed by default.
                </p>
              </div>

              {quickCoreTokens.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs uppercase text-text-muted">Core tokens</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickCoreTokens.map((token) => (
                      <button
                        key={token.address}
                        onClick={() => handleSetToken(token)}
                        className="rounded-full border border-border bg-bg-page px-3 py-1 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary"
                      >
                        {token.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border">
                {isLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <div className="flex items-center gap-2 text-text-muted">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      Loading tokens...
                    </div>
                  </div>
                ) : filteredTokens.length === 0 ? (
                  <div className="flex h-48 items-center justify-center">
                    <p className="text-sm text-text-muted">
                      No tokens match your search.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredTokens.map((token) => {
                      const badge = originBadge(token);
                      const tokenKey = token.address.toLowerCase();
                      const rawBalance = tokenBalances[tokenKey];
                      const showBalanceSpinner =
                        Boolean(account) &&
                        isTokenBalancesLoading &&
                        rawBalance === undefined;
                      const formattedBalance = formatBalanceDisplay(
                        rawBalance,
                        token.decimals
                      );

                      return (
                        <li key={token.address}>
                          <button
                            onClick={() => handleSetToken(token)}
                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-primary-050/40"
                          >
                            <div className="flex items-center gap-3">
                              <TokenIcon token={token} size={36} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-text">
                                    {token.symbol}
                                  </span>
                                  {token.tier === "unverified" && (
                                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-warning">
                                      Unverified
                                    </span>
                                  )}
                                  {badge && (
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${badge.className}`}
                                    >
                                      {badge.label}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-text-muted">
                                  {token.name}
                                </p>
                              </div>
                            </div>
                            <div className="ml-auto flex items-center gap-4">
                              <p className="hidden text-xs font-mono text-text-muted sm:block">
                                {token.address.slice(0, 6)}...{token.address.slice(-4)}
                              </p>
                              {account && (
                                <div className="w-20 text-right">
                                  {showBalanceSpinner ? (
                                    <div className="flex items-center justify-end">
                                      <svg
                                        className="h-4 w-4 animate-spin text-text-subtle"
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
                                    <div>
                                      <div className="text-sm font-semibold text-text">
                                        {formattedBalance}
                                      </div>
                                      <div className="text-xs text-text-subtle">
                                        {token.symbol}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TokenPopup;
