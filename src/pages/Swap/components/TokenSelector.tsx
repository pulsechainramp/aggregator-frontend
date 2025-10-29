import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import React from "react";
import { TokenType } from "../../../types/Swap";

interface TokenSelectorProps {
  token: TokenType | null;
  allChains: TokenType[];
  type: "from" | "to";
  onSelect: () => void;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  token,
  allChains,
  type,
  onSelect,
}) => {
  const networkIcon = token
    ? allChains.find(
        (chain) =>
          chain.blockchainNetwork === token.blockchainNetwork ||
          chain.network === token.network
      )?.image
    : undefined;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="inline-flex min-w-[180px] items-center gap-3 rounded-full border border-border bg-bg-surface px-4 py-2 text-left font-semibold text-text shadow-sm transition-colors hover:border-primary hover:bg-primary-050/60"
      aria-label={`${type === "from" ? "Select source token" : "Select destination token"}`}
    >
      {token ? (
        <>
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-bg-page">
            {token.image ? (
              <img
                src={token.image}
                alt={token.symbol}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold">{token.symbol}</span>
            )}
            {networkIcon && (
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-bg-surface bg-primary-050">
                <img
                  src={networkIcon}
                  alt={`${token.network} icon`}
                  className="h-4 w-4 rounded-full object-cover"
                  onError={(event) => {
                    (event.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex max-w-[120px] flex-col items-start">
            <span className="text-xs font-medium text-text-muted">{token.network}</span>
            <span className="w-full truncate text-base">{token.symbol}</span>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span>Select Token</span>
        </div>
      )}
      <ChevronDownIcon className="h-4 w-4 text-text-muted" />
    </motion.button>
  );
};

export default TokenSelector;
