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
      className="inline-flex min-w-[180px] items-center gap-3 rounded-full border border-border bg-bg-surface px-4 py-2 text-left font-semibold text-text shadow-sm transition-colors hover:border-primary hover:bg-primary-050/60"
      aria-label={`${type === "from" ? "Select source token" : "Select destination token"}`}
    >
      {token ? (
        <>
          <TokenIcon token={token} size={44} />
          <div className="flex max-w-[120px] flex-col items-start">
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
