import { ArrowsUpDownIcon } from "@heroicons/react/24/solid";
import React from "react";

interface TokenSwapButtonProps {
  onSwap: () => void;
}

const TokenSwapButton: React.FC<TokenSwapButtonProps> = ({ onSwap }) => {
  return (
    <div className="relative flex items-center justify-center py-4">
      <div className="h-px w-full bg-border" />
      <button
        type="button"
        onClick={onSwap}
        className="absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg-page text-text transition-colors hover:bg-bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label="Swap tokens"
      >
        <ArrowsUpDownIcon className="h-4 w-4 text-text-muted sm:h-5 sm:w-5" />
      </button>
    </div>
  );
};

export default TokenSwapButton;
