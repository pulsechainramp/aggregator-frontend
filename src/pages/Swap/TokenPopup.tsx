import { AnimatePresence, motion } from "framer-motion";
import React, { useMemo } from "react";
import TokenIcon from "../../components/TokenIcon";
import { useAppDispatch } from "../../store/hooks";
import { setFromToken, setToToken } from "../../store/swapSlice";
import { TokenType } from "../../types/Swap";

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
  const normalizedSearch = searchToken.trim().toLowerCase();

  const priorityOrder = ["PLS", "PLSX", "HEX", "INC", "WETH", "WBTC", "USDC", "USDT", "DAI"];

  const filteredTokens = useMemo(() => {
    const source = normalizedSearch.length > 0 ? allTokens : tokens;
    const filtered = source.filter((token) => {
      if (!normalizedSearch) return true;
      const candidates = [
        token.symbol,
        token.name,
        token.address,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());
      return candidates.some((value) => value.includes(normalizedSearch));
    });

    return filtered.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.symbol ?? "");
      const bPriority = priorityOrder.indexOf(b.symbol ?? "");
      const aRank = aPriority === -1 ? Number.MAX_SAFE_INTEGER : aPriority;
      const bRank = bPriority === -1 ? Number.MAX_SAFE_INTEGER : bPriority;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      const tierRank = (token: TokenType) => (token.tier === "core" ? 0 : token.tier === "verified" ? 1 : 2);
      const aTier = tierRank(a);
      const bTier = tierRank(b);
      if (aTier !== bTier) {
        return aTier - bTier;
      }
      const symbolA = a.symbol ?? "";
      const symbolB = b.symbol ?? "";
      return symbolA.localeCompare(symbolB);
    });
  }, [tokens, normalizedSearch]);

  const originBadge = (token: TokenType) => {
    // Prefork tokens keep a badge; native/bridged labels are hidden per requirements
    if (token.origin === "prefork") {
      return { label: "Prefork", className: "bg-warning/10 text-warning" };
    }
    return undefined;
  };

  const coreOrder = ["PLS", "PLSX", "HEX", "INC", "WETH", "WBTC", "USDC", "USDT", "DAI"];
  const tokenPool = [
    ...coreTokens,
    ...allTokens.filter(
      (t) =>
        (t.chainId === 369 || t.blockchainNetwork?.toLowerCase() === "pulsechain" || t.network?.toLowerCase() === "pulsechain")
    ),
  ];
  const quickCoreTokens = coreOrder
    .map((symbol) => tokenPool.find((t) => t.symbol === symbol))
    .filter((token, idx, arr) => token && arr.findIndex((t) => t?.address === token.address) === idx) as TokenType[];

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
                  Core tokens are shown first. Only verified tokens are listed by default.
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
                      Loading tokens…
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
                          <p className="text-xs font-mono text-text-muted">
                            {token.address.slice(0, 6)}...{token.address.slice(-4)}
                          </p>
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
