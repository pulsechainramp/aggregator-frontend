import { Cog6ToothIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { CurrencyDollarIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import React from "react";
import { Link } from "react-router-dom";

interface SwapHeaderProps {
  slippage: number;
  onSlippageClick: () => void;
  onRefreshClick: () => void;
  isRefreshing?: boolean;
}

const SwapHeader: React.FC<SwapHeaderProps> = ({ 
  slippage, 
  onSlippageClick, 
  onRefreshClick, 
  isRefreshing = false 
}) => {
  return (
    <div className="flex justify-between items-center mb-3 sm:mb-4">
      <h3 className="font-semibold text-lg sm:text-xl">Swap</h3>
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="text-xs text-gray-400 bg-gray-700 px-1.5 sm:px-2 py-1 rounded-full">
          {slippage}% slippage
        </div>
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.3 }}
          className="cursor-pointer"
          onClick={onRefreshClick}
        >
          <ArrowPathIcon
            className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
        </motion.div>
        <motion.div
          whileHover={{ rotate: 90 }}
          transition={{ duration: 0.3 }}
        >
          <Cog6ToothIcon
            className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 cursor-pointer"
            onClick={onSlippageClick}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default SwapHeader; 