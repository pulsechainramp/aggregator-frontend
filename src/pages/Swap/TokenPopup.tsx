import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TokenIcon from "../../components/TokenIcon";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  clearTokenBalances,
  getTokenBalancesBatch,
  importCustomToken,
  removeCustomToken,
  clearCustomTokens,
  setFromToken,
  setToToken,
} from "../../store/swapSlice";
import { TokenType } from "../../types/Swap";
import useWallet from "../../hooks/useWallet";
import {
  filterAndSortTokensByBalance,
  formatBalanceDisplay,
} from "../../utils/tokenSort";
import { ethers } from "ethers";
import * as toastify from "react-toastify";

const { toast } = toastify;

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
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { tokenBalances, isTokenBalancesLoading } = useAppSelector(
    (state) => state.swap
  );
  const { account, currentChainId } = useWallet();
  const previousAccount = useRef<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageAddress, setManageAddress] = useState<string>("");
  const [isManageMode, setIsManageMode] = useState(false);
  const [removingAddress, setRemovingAddress] = useState<string | null>(null);
  const normalizeAddr = useCallback(
    (addr?: string | null) => (addr ? addr.trim().toLowerCase() : ""),
    []
  );
  const normalizedSearch = searchToken.trim().toLowerCase();

  const coreOrder = useMemo(
    () => ["PLS", "PLSX", "HEX", "INC", "PRVX", "USDC", "USDT"],
    []
  );
  const priorityOrder = useMemo(
    () => [...coreOrder, "RAMP"],
    [coreOrder]
  );

  const coreSymbolSet = useMemo(
    () =>
      new Set(
        coreTokens
          .map((token) => token.symbol?.toUpperCase() ?? "")
          .filter(Boolean)
      ),
    [coreTokens]
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

  const sourceTokensKey = useMemo(
    () =>
      sourceTokens
        .map((t) => normalizeAddr(t.address))
        .filter(Boolean)
        .join("|"),
    [sourceTokens]
  );

  const quickCoreTokens = useMemo(() => {
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
  }, [coreTokens, allTokens, coreOrder]);

  const normalizedSearchAddress = useMemo(
    () => normalizeAddr(searchToken),
    [searchToken]
  );

  const searchIsAddress = useMemo(
    () => Boolean(searchToken.trim()) && ethers.isAddress(searchToken.trim()),
    [searchToken]
  );

  const hasTokenAlready = useMemo(
    () =>
      allTokens.some(
        (token) => normalizeAddr(token.address) === normalizedSearchAddress
      ),
    [allTokens, normalizedSearchAddress]
  );

  const canImportCustom = searchIsAddress && !hasTokenAlready && (!currentChainId || currentChainId === 369);

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
  }, [dispatch, account, isOpen, sourceTokensKey, sourceTokens.length, currentChainId]);

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
        corePriority: priorityOrder,
      }),
    [sourceTokens, searchToken, tokenBalances, coreSymbolSet, priorityOrder]
  );

  const tokenLookup = useMemo(() => {
    const map = new Map<string, TokenType>();
    for (const token of allTokens) {
      const addr = normalizeAddr(token.address);
      if (!addr) continue;
      if (!map.has(addr)) {
        map.set(addr, token);
      }
    }
    return map;
  }, [allTokens, normalizeAddr]);

  const displayTokens = useMemo(
    () =>
      filteredTokens.map((token) => {
        if (
          !token.isCustom ||
          token.logoURI ||
          token.image ||
          (token as any).remoteLogoURIs?.length
        ) {
          return token;
        }
        const match = tokenLookup.get(normalizeAddr(token.address));
        if (
          match &&
          (match.logoURI || match.image || (match as any).remoteLogoURIs?.length)
        ) {
          return {
            ...token,
            logoURI: match.logoURI ?? match.image,
            image: match.image ?? match.logoURI,
            remoteLogoURIs: (match as any).remoteLogoURIs ?? [],
          };
        }
        return token;
      }),
    [filteredTokens, tokenLookup, normalizeAddr]
  );

  useEffect(() => {
    setImportError(null);
  }, [searchToken]);
  useEffect(() => {
    if (!isOpen) {
      setIsManageMode(false);
      setManageAddress("");
      setManageError(null);
    }
  }, [isOpen]);

  const originBadge = (token: TokenType) => {
    // Prefork tokens keep a badge; native/bridged labels are hidden per requirements
    if (token.origin === "prefork") {
      return { label: "Prefork", className: "bg-warning/10 text-warning" };
    }
    return undefined;
  };

  const handleImportToken = async () => {
    if (!canImportCustom) return;
    setIsImporting(true);
    setImportError(null);
    setManageError(null);
    try {
      const token = await dispatch(
        importCustomToken({ address: searchToken.trim() })
      ).unwrap();
      toast.success(`Imported ${token.symbol || "token"}`);
      handleSetToken(token);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to import custom token.";
      setImportError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleManageImport = async () => {
    const addr = manageAddress.trim();
    setManageError(null);
    if (!addr) return;
    if (!ethers.isAddress(addr)) {
      setManageError("Enter a valid token address.");
      return;
    }
    // Reuse the same guards as the main search flow: chain check and existing token dedupe
    const normalized = normalizeAddr(addr);
    const alreadyHasToken = allTokens.some(
      (token) => normalizeAddr(token.address) === normalized
    );
    const wrongChain = Boolean(currentChainId && currentChainId !== 369);
    if (wrongChain) {
      setManageError("Switch to PulseChain to import custom tokens.");
      return;
    }
    if (alreadyHasToken) {
      setManageError("Token already added.");
      return;
    }
    setIsImporting(true);
    try {
      const token = await dispatch(importCustomToken({ address: addr })).unwrap();
      toast.success(`Imported ${token.symbol || "token"}`);
      setManageAddress("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to import custom token.";
      setManageError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  const customTokens = useAppSelector((state) => state.swap.customTokens);
  const sortedCustomTokens = useMemo(() => {
    const compare = (a: TokenType, b: TokenType) => {
      const aKey = (a.symbol || a.name || "").toLowerCase();
      const bKey = (b.symbol || b.name || "").toLowerCase();
      if (aKey && bKey) {
        const diff = aKey.localeCompare(bKey, undefined, { sensitivity: "base" });
        if (diff !== 0) return diff;
      } else if (aKey || bKey) {
        // Prefer entries with labels over blank ones
        return aKey ? -1 : 1;
      }
      // Fallback to address for deterministic ordering
      return (a.address || "").localeCompare(b.address || "", undefined, { sensitivity: "base" });
    };
    return [...customTokens].sort(compare);
  }, [customTokens]);

  const handleRemoveCustom = async (address: string) => {
    setRemovingAddress(address);
    try {
      dispatch(removeCustomToken(address));
    } finally {
      setRemovingAddress(null);
    }
  };

  const handleClearCustomTokens = () => {
    if (!customTokens.length) return;
    dispatch(clearCustomTokens());
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
            className="flex w-full max-w-2xl max-h-[95vh] flex-col overflow-hidden rounded-xl border border-border bg-bg-surface shadow-floating"
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

            <div className="flex-1 overflow-hidden p-4 flex flex-col gap-4 min-h-0">
              {!isManageMode && (
                <div className="mb-4">
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search name or address"
                      className="w-full rounded-lg border border-border bg-bg-page px-4 py-2 pl-10 pr-10 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                    {searchToken && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                          setSearchToken("");
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted transition-colors hover:text-text"
                      >
                        <svg
                          className="h-4 w-4"
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
                    )}
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    Sorted by your balance, then core tokens. Only verified tokens are listed by default.
                  </p>
                </div>
              )}

              {canImportCustom && (
                <div className="mb-4 rounded-lg border border-warning bg-warning-050/60 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-warning">
                      Import custom token: {searchToken.trim()}
                      <div className="text-xs text-warning/80">
                        Unverified tokens may be unsafe. Double-check the address.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleImportToken}
                      disabled={isImporting}
                      className="inline-flex items-center justify-center rounded-md border border-warning bg-warning px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-warning-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isImporting ? "Importing..." : "Import token"}
                    </button>
                  </div>
                  {importError && (
                    <p className="mt-2 text-xs text-danger">{importError}</p>
                  )}
                </div>
              )}

              {quickCoreTokens.length > 0 && !isManageMode && (
                <div className="mb-4 hidden sm:block">
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

              {isManageMode ? (
                <div className="flex flex-col gap-3 flex-1 min-h-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text">Manage custom tokens</p>
                      <p className="text-xs text-text-muted">Remove or add contract addresses you’ve imported.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsManageMode(false)}
                      className="text-sm font-semibold text-primary transition-colors hover:text-primary-600"
                    >
                      Back to tokens
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <input
                        type="text"
                        placeholder="Paste token address"
                        value={manageAddress}
                        onChange={(event) => {
                          setManageAddress(event.target.value);
                          setManageError(null);
                        }}
                        className="w-full flex-1 rounded-lg border border-border bg-bg-page px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        type="button"
                        onClick={handleManageImport}
                        disabled={isImporting || !manageAddress.trim()}
                        className="inline-flex items-center justify-center rounded-md border border-primary bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isImporting ? "Importing..." : "Import"}
                      </button>
                    </div>
                    {manageError && (
                      <p className="text-xs text-danger">{manageError}</p>
                    )}
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
                    <div className="rounded-lg border border-border">
                      {sortedCustomTokens.length === 0 ? (
                        <div className="flex h-32 items-center justify-center px-4 text-sm text-text-muted">
                          No custom tokens yet.
                        </div>
                      ) : (
                        <ul className="divide-y divide-border">
                          {sortedCustomTokens.map((token) => (
                            <li
                              key={token.address}
                              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-text">{token.symbol}</span>
                                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-warning">
                                    Custom
                                  </span>
                                </div>
                                <p className="text-xs text-text-muted">
                                  {token.name || `Custom token (${token.address.slice(0, 6)}...${token.address.slice(-4)})`}
                                </p>
                                <p className="break-all text-[11px] font-mono text-text-subtle">
                                  {token.address}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustom(token.address)}
                                disabled={removingAddress === token.address}
                                className="w-full rounded-md border border-border px-2 py-2 text-xs font-semibold text-text transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-1"
                              >
                                {removingAddress === token.address ? "Removing..." : "Remove"}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center pt-2 shrink-0 sm:justify-end">
                    <button
                      type="button"
                      onClick={handleClearCustomTokens}
                      disabled={customTokens.length === 0}
                      className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove all custom tokens
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-h-0 gap-3">
                  <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border">
                    {isLoading ? (
                      <div className="flex h-48 items-center justify-center">
                        <div className="flex items-center gap-2 text-text-muted">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          Loading tokens...
                        </div>
                      </div>
                    ) : displayTokens.length === 0 ? (
                      <div className="flex h-48 items-center justify-center">
                        <p className="text-sm text-text-muted">
                          No tokens match your search.
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {displayTokens.map((token) => {
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
                                      {token.name || `Custom token (${token.address.slice(0, 6)}...${token.address.slice(-4)})`}
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
                  <div className="mt-1 flex justify-center shrink-0 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsManageMode(true);
                        setManageError(null);
                      }}
                      className="text-xs font-semibold text-primary transition-colors hover:text-primary-600"
                    >
                      Manage tokens
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TokenPopup;
