import React, { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import RouteDetailsPopup from "./RouteDetailPopup";
import { motion } from "framer-motion";
import { useQuoteSummary } from "../../hooks/useQuoteSummary";
import { useAppSelector } from "../../store/hooks";

const QuotePanel = () => {
  const { fromToken, toToken } = useAppSelector((state) => state.swap);
  const [showRoute, setShowRoute] = useState(false);
  const [open, setOpen] = useState(false);
  const summary = useQuoteSummary();

  const {
    netToTokenAmount,
    priceImpact,
    networkFeeUsd,
    referralFeeBps,
    netMinOutput,
    slippage,
    fromAmountNumber,
    fromTokenUsdPrice,
  } = summary;

  const toSymbol = toToken?.symbol ?? "--";
  const fromSymbol = fromToken?.symbol ?? "--";

  const formatTokenAmount = (value: number, digits = 6) => {
    if (!Number.isFinite(value)) {
      return "0";
    }
    if (value === 0) {
      return "0";
    }
    return Number(value.toFixed(digits)).toLocaleString();
  };

  const formatUsd = (value: number | null, digits = 2) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    return `$${value.toFixed(digits)}`;
  };

  const feePercent =
    referralFeeBps > 0 ? `-${(referralFeeBps / 100).toFixed(2)}%` : "0%";
  const priceImpactDisplay = Number.isFinite(priceImpact)
    ? `${priceImpact.toFixed(2)}%`
    : "--";
  const fromToToRate =
    fromAmountNumber > 0 ? netToTokenAmount / fromAmountNumber : 0;
  const fromToToDisplay =
    fromToToRate > 0
      ? `${formatTokenAmount(fromToToRate, 8)} ${toSymbol}`
      : `0 ${toSymbol}`;
  const usdPriceDisplay =
    typeof fromTokenUsdPrice === "number"
      ? `($${fromTokenUsdPrice.toFixed(4)})`
      : "";

  return (
    <div className="mt-2 w-full rounded-xl border border-border bg-bg-surface p-4 text-text shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-base font-semibold text-text">
          1 {fromSymbol} = {fromToToDisplay}
          {usdPriceDisplay && <span className="ml-1 text-sm text-text-muted">{usdPriceDisplay}</span>}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-text"
          aria-expanded={open}
        >
          Details
          {open ? (
            <ChevronUpIcon className="ml-1 h-4 w-4 text-current" />
          ) : (
            <ChevronDownIcon className="ml-1 h-4 w-4 text-current" />
          )}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Network fee</span>
              <span className="font-medium text-text">
                {networkFeeUsd !== null
                  ? formatUsd(networkFeeUsd, 3) ?? "--"
                  : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Price impact</span>
              <span className="font-medium text-text">
                {priceImpactDisplay}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Slippage tolerance</span>
              <span className="font-medium text-text">{slippage}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Referral fee</span>
              <span className="font-medium text-text">{feePercent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Minimum output</span>
              <span className="font-mono font-medium text-text">
                {formatTokenAmount(netMinOutput, 8)} {toSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Expected output</span>
              <span className="font-mono font-medium text-text">
                {formatTokenAmount(netToTokenAmount, 8)} {toSymbol}
              </span>
            </div>
          </div>
          <div className="flex justify-end border-t border-border pt-3">
            <button
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
              onClick={() => setShowRoute(true)}
              type="button"
            >
              Show Route
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
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
