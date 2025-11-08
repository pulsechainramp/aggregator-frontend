import React from "react";

const InfoIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

type Props = {
  onClickBuy: () => void;
  currentEth: number;
  thresholdEth?: number;
  estimatedEth?: number | null;
  loading?: boolean;
};

export default function OnRampBanner({
  onClickBuy,
  currentEth,
  thresholdEth = 0.02,
  estimatedEth,
  loading = false,
}: Props) {
  const needsEth = currentEth < thresholdEth;
  if (!needsEth) return null;

  const formatEstimatedFee = () => {
    if (loading) return "calculating...";
    if (estimatedEth === undefined || estimatedEth === null) {
      return `${thresholdEth.toFixed(4)} ETH`;
    }

    if (estimatedEth >= 0.001) {
      return `${estimatedEth.toFixed(4)} ETH`;
    }

    if (estimatedEth >= 0.0001) {
      return `${estimatedEth.toFixed(5)} ETH`;
    }

    return "<0.0001 ETH";
  };

  const feeDisplay = formatEstimatedFee();

  return (
    <div className="mt-6 rounded-lg border border-border bg-primary-050/60 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-primary">
          <InfoIcon />
        </div>
        <div className="flex-1 space-y-2 md:flex md:items-center md:justify-between md:space-y-0">
          <div>
            <p className="font-semibold text-text">Add a little more ETH for fees</p>
            <p className="text-sm text-text-muted">
              Estimated fee: <span className="font-mono">{feeDisplay}</span>. Wallet balance:{" "}
              <span className="font-mono">{currentEth.toFixed(6)} ETH</span>. Add a small amount so
              the bridge can complete smoothly.
            </p>
          </div>
          <div className="mt-3 md:ml-6 md:mt-0">
            <button
              onClick={onClickBuy}
              className="touch-target inline-flex w-full items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-primary-600 hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:w-auto md:min-w-[120px]"
            >
              Buy ETH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
