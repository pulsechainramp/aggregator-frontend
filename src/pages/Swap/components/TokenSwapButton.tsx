import { ArrowsUpDownIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import React from "react";

interface TokenSwapButtonProps {
  onSwap: () => void;
}

const TokenSwapButton: React.FC<TokenSwapButtonProps> = ({ onSwap }) => {
  return (
    <div className="relative">
      <hr className="my-2 border-border" />
      <motion.div
        onClick={onSwap}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      >
        <div className="flex items-center justify-center rounded-full border border-border bg-bg-page p-2 shadow-sm">
          <ArrowsUpDownIcon className="h-4 w-4 text-text-muted sm:h-5 sm:w-5" />
        </div>
      </motion.div>
    </div>
  );
};

export default TokenSwapButton; 
