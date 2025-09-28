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

  // derive “source” and hop count
  const sourceLabel = !quote ? null : (quote as any).source === "piteas" ? "Piteas" : "PulseX";

  const hopTokens =
    quote?.route?.[0]?.subroutes?.[0]?.paths?.[0]?.tokens?.length ?? 0;
  const hopCount = hopTokens > 1 ? hopTokens - 1 : 0;

  const toTokenAmount =
    quote?.outputAmount && toToken?.decimals
      ? Number(ethers.formatUnits(quote?.outputAmount, toToken?.decimals))
      : 0;

  const minOutput = toTokenAmount * (1 - slippage / 100);

  const fromPx = Number(fromToken?.price ?? 0);
  const toPx   = Number(toToken?.price ?? 0);

  // Price implied by the current live quote (preferred for display)
  const impliedUsdPerTo =
  fromPx > 0 && toTokenAmount > 0 && Number(fromAmount) > 0
    ? (Number(fromAmount) * fromPx) / toTokenAmount
    : 0;

  const oracleUsdPerTo = toPx > 0 ? toPx : 0;

  // Prefer oracle (from getTokenPrice) for display; fall back to implied if oracle not ready
  const usdPerToForDisplay = oracleUsdPerTo > 0 ? oracleUsdPerTo : impliedUsdPerTo;

  // Keep “price impact” using oracle-to-oracle baseline so it doesn’t collapse to 0
  const denom =
    (Number(fromAmount || 0) * fromPx) / (toPx > 0 ? toPx : 1);

  const impact =
    fromPx > 0 && toPx > 0 && toTokenAmount > 0 && denom > 0
      ? ((toTokenAmount - denom) / denom) * 100
      : 0;


  const fmtUsd = (v?: number) => {
    const n = Number(v ?? 0);
    const abs = Math.abs(n);

    // Big values: keep it tidy; Medium: a touch more; Tiny: show real detail
    const opts =
      abs >= 1
        ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        : abs >= 0.01
          ? { minimumFractionDigits: 4, maximumFractionDigits: 6 }
          : { minimumFractionDigits: 8, maximumFractionDigits: 10 };

    return n.toLocaleString(undefined, opts);
  };

  const feeUsd = (quote?.gasUSDEstimated ?? (quote as any)?.gasUseEstimateUSD ?? 0);

  // Adaptive formatting for tiny ratios (e.g., PLS priced in WETH/USDC)
  const formatRatio = (fromAmt: number, toAmt: number) => {
    if (!toAmt || !fromAmt) return "—";
    const r = fromAmt / toAmt;
    const abs = Math.abs(r);
    const decimals =
      abs >= 1     ? 6 :
      abs >= 0.01  ? 8 :
      12; // very tiny values → show more precision
    return r.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatToken = (val: number, tokenDecimals?: number) => {
    const n = Number(val || 0);
    const abs = Math.abs(n);
    const decimals =
      abs >= 1     ? 6 :
      abs >= 0.01  ? 8 :
      Math.min(12, tokenDecimals ?? 18);
    return n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

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
          {formatRatio(Number(fromAmount) || 1, toTokenAmount)}{" "}
          {fromToken?.symbol}
        </span>
        <span className="text-white/50">(${fmtUsd(Number(usdPerToForDisplay))})</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/60 select-none">
          {sourceLabel && (
            <span className="px-2 py-0.5 rounded bg-slate-700/60 text-[11px]">
              Source: {sourceLabel}
            </span>
          )}
          {hopCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-slate-700/60 text-[11px]">
              {hopCount}-hop
            </span>
          )}
          <span className="flex items-center gap-1">
            Details {open ? <ChevronUpIcon className="w-4 h-4 ml-1" /> : <ChevronDownIcon className="w-4 h-4 ml-1" />}
          </span>
        </div>
      </div>
      {/* Details */}
      {open && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">Network fee</span>
            <span className="text-white/80">
              {feeUsd.toFixed ? feeUsd.toFixed(3) : Number(feeUsd).toFixed(3)}$
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
              {formatToken(minOutput, toToken?.decimals)} {toToken?.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Expected output</span>
            <span className="text-white/80 font-mono">
              {formatToken(toTokenAmount, toToken?.decimals)} {toToken?.symbol}
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
