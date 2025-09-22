import React from "react";

const InfoIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

type Props = {
  onClickBuy: () => void;
  thresholdEth?: number; // default 0.02
  currentEth: number;
};

export default function OnRampBanner({ onClickBuy, currentEth, thresholdEth = 0.02 }: Props) {
  const needsEth = currentEth < thresholdEth;

  if (!needsEth) return null;

  return (
    <div className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
            <InfoIcon />
        </div>
        <div className="ml-3 flex-1 md:flex md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-white">You'll Need ETH for this Transaction</p>
            <p className="mt-1 text-sm text-white/70">
              Your wallet has <span className="font-mono">{currentEth.toFixed(6)} ETH</span>. (We recommend at least $100 for bridging)
            </p>
          </div>
          <div className="mt-3 md:mt-0 md:ml-6">
            <button
              onClick={onClickBuy}
              className="inline-flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 whitespace-nowrap"
            >
              Buy ETH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
