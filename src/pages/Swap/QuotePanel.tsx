import React, { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { useAppSelector } from "../../store/hooks";
import { ethers } from "ethers";
import RouteDetailsPopup from "./RouteDetailPopup";
import { AnimatePresence, motion } from "framer-motion";

const QuotePanel = () => {
  const { fromToken, toToken, quote, slippage, fromAmount } = useAppSelector(
    (state) => state.swap
  );

  const [showRoute, setShowRoute] = useState(false);
  const apiVersion = "2.3";

  const [open, setOpen] = useState(true);
  const toTokenAmount =
    quote?.outputAmount && toToken?.decimals
      ? Number(ethers.formatUnits(quote?.outputAmount, toToken?.decimals))
      : 0;

  const minOutput = toTokenAmount * (1 - slippage / 100);

  const impact =
    fromToken && toToken
      ? ((toTokenAmount -
          (Number(fromAmount) * fromToken?.usdPrice) / toToken?.usdPrice) /
          ((Number(fromAmount) * fromToken?.usdPrice) / toToken?.usdPrice)) *
        100
      : 0;

  return (
    <div className="bg-[#1e2030] rounded-xl p-4 shadow-lg text-white w-full mt-2">
      {/* Top row */}
      <div
        className="flex items-center justify-between cursor-pointer w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="text-white/90">
            1 {toToken?.symbol} ={" "}
            {Number(((Number(fromAmount) || 1) / toTokenAmount).toFixed(10))}{" "}
            {fromToken?.symbol}
          </span>
          <span className="text-white/50">
            ($
            {Number(toToken?.usdPrice).toFixed(5).toLocaleString()})
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm text-white/60 select-none">
          Details
          {open ? (
            <ChevronUpIcon className="w-4 h-4 ml-1" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 ml-1" />
          )}
        </div>
      </div>
      {/* Details */}
      {open && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">Network fee</span>
            <span className="text-white/80">
              {quote?.gasUSDEstimated?.toFixed(3)}$
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Price Impact</span>
            <span className="text-white/80">{impact.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Slippage tolerance</span>
            <span className="text-white/80">{slippage}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Minimum output</span>
            <span className="text-white/80 font-mono">
              {Number(minOutput.toFixed(10))} {toToken?.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Expected output</span>
            <span className="text-white/80 font-mono">
              {Number(toTokenAmount.toFixed(10))} {toToken?.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
            <span className="text-xs text-white/40">
            </span>
            <div
              className="relative flex items-center cursor-pointer"
              onClick={() => setShowRoute(true)}
            >
              <button className="text-pink-500 text-xs font-semibold flex items-center gap-1 hover:underline">
                Show Route
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 6.75L21 10.5m0 0l-3.75 3.75M21 10.5H3"
                  />
                </svg>
              </button>
              <AnimatePresence></AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {showRoute && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          onClick={() => setShowRoute(false)}
        >
          <motion.div
            className="bg-[#191b2a] border border-[#23263b] rounded-2xl shadow-lg p-6 text-white max-w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <RouteDetailsPopup />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default QuotePanel;
