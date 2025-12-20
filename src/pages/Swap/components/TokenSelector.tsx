import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import React from "react";
import TokenIcon from "../../../components/TokenIcon";
import { TokenType } from "../../../types/Swap";

interface TokenSelectorProps {
  token: TokenType | null;
  type: "from" | "to";
  onSelect: () => void;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  token,
  type,
  onSelect,
}) => {
  const getOriginLabel = (candidate: TokenType) => {
    switch (candidate.origin) {
      case "bridged-eth":
        return "Bridged (ETH)";
      case "prefork":
        return "Prefork";
      default:
        return undefined;
    }
  };

  const networkLabel = token
    ? token.network ??
      (token.blockchainNetwork
        ? token.blockchainNetwork.charAt(0).toUpperCase() +
          token.blockchainNetwork.slice(1)
        : "PulseChain")
    : undefined;
  const originLabel = token ? getOriginLabel(token) : undefined;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="relative flex w-full items-center gap-3 rounded-full border border-border bg-bg-surface px-4 pr-10 py-2 text-left font-semibold text-text shadow-sm transition-colors hover:border-primary hover:bg-primary-050/60 sm:w-auto sm:min-w-[180px]"
      aria-label={`${type === "from" ? "Select source token" : "Select destination token"}`}
    >
      {token ? (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <TokenIcon token={token} size={44} />
          <div className="flex flex-1 min-w-0 flex-col items-start sm:max-w-[120px]">
            <span className="text-xs font-medium text-text-muted">
              {networkLabel}
            </span>
            <span className="w-full truncate text-base">{token.symbol}</span>
            {originLabel && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
                {originLabel}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-text-muted flex-1">
          <span>Select Token</span>
        </div>
      )}
      <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
    </motion.button>
  );
};

export default TokenSelector;
