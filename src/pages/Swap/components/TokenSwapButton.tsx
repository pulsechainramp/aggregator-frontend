import { ArrowsUpDownIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import React from "react";

interface TokenSwapButtonProps {
  onSwap: () => void;
}

const TokenSwapButton: React.FC<TokenSwapButtonProps> = ({ onSwap }) => {
  return (
    <div className="relative">
      <hr className="border-[#2b2e4a] my-2" />
      <motion.div
        onClick={onSwap}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
      >
        <div className="bg-[#1a1c2c] p-1.5 sm:p-2 rounded-full shadow-lg flex items-center justify-center">
          <ArrowsUpDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        </div>
      </motion.div>
    </div>
  );
};

export default TokenSwapButton; 