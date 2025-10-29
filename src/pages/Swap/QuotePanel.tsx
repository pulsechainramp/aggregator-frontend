import React, { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { useAppSelector } from "../../store/hooks";
import { ethers } from "ethers";
import RouteDetailsPopup from "./RouteDetailPopup";
import { motion } from "framer-motion";

const QuotePanel = () => {
  const { fromToken, toToken, quote, slippage, fromAmount } = useAppSelector(
    (state) => state.swap
  );

  const [showRoute, setShowRoute] = useState(false);
  const apiVersion = "2.3";

  const [open, setOpen] = useState(false);
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
    <div className="mt-2 w-full rounded-xl border border-border bg-bg-surface p-4 text-text shadow-sm sm:p-5">
      {/* Top row */}
      <div
        className="flex items-center justify-between cursor-pointer w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 text-base font-semibold text-text">
          <span>
            1 {toToken?.symbol} ={" "}
            {Number(((Number(fromAmount) || 1) / toTokenAmount).toFixed(10))}{" "}
            {fromToken?.symbol}
          </span>
          <span className="text-text-muted">
            ($
            {Number(toToken?.usdPrice).toFixed(5).toLocaleString()})
          </span>
        </div>
        <div className="select-none flex items-center gap-1 text-sm text-text-muted">
          Details
          {open ? (
            <ChevronUpIcon className="ml-1 h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDownIcon className="ml-1 h-4 w-4 text-text-muted" />
          )}
        </div>
      </div>
      {/* Details */}
      {open && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Network fee</span>
            <span className="font-medium text-text">
              {quote?.gasUSDEstimated?.toFixed(3)}$
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Price impact</span>
            <span className="font-medium text-text">{impact.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Slippage tolerance</span>
            <span className="font-medium text-text">{slippage}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Minimum output</span>
            <span className="font-mono font-medium text-text">
              {Number(minOutput.toFixed(10))} {toToken?.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Expected output</span>
            <span className="font-mono font-medium text-text">
              {Number(toTokenAmount.toFixed(10))} {toToken?.symbol}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="text-xs text-text-subtle">
            </span>
            <div
              className="relative flex items-center cursor-pointer"
              onClick={() => setShowRoute(true)}
            >
              <button className="flex items-center gap-1 rounded-md px-1 py-1 text-xs font-semibold text-primary transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40">
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
            </div>
          </div>
        </div>
      )}

      {showRoute && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay"
          onClick={() => setShowRoute(false)}
        >
          <motion.div
            className="max-w-full rounded-2xl border border-border bg-bg-surface p-6 text-text shadow-floating"
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
