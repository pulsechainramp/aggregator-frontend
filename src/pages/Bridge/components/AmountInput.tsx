import React from "react";
import { motion } from "framer-motion";
import useWallet from "../../../hooks/useWallet";
import AddToWalletButton from "../../../components/AddToWalletButton";
import { tryParseAmountToWei } from "../../../utils/amount";
import {
  MIN_NATIVE_ETH_AMOUNT_WEI,
  MIN_NATIVE_ETH_AMOUNT_DISPLAY,
} from "../constants";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedToken: string;
  balance: string;
  balanceLoading: boolean;
  tokenAddress?: string;
  onCopyAddress?: () => void;
  showButtons?: boolean;
  fromChainId?: number;
  selectedTokenData?: any;
}

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  selectedToken,
  balance,
  balanceLoading,
  tokenAddress,
  onCopyAddress,
  showButtons = false,
  fromChainId,
  selectedTokenData,
}) => {
  const { account } = useWallet();
  const isConnected = !!account;

  const tokenDecimals = selectedTokenData?.decimals ?? 18;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (/^\d*\.?\d*$/.test(inputValue) || inputValue === "") {
      onChange(inputValue);
    }
  };

  const handleMaxClick = () => {
    if (!balance || balanceLoading) return;
    const balanceWei = tryParseAmountToWei(balance, tokenDecimals);
    if (balanceWei && balanceWei > 0n) {
      onChange(balance);
    }
  };

  const minForToken = (() => {
    const base = MIN_NATIVE_ETH_AMOUNT_WEI;
    const decimals = BigInt(tokenDecimals ?? 18);
    if (decimals === 18n) return base;
    if (decimals > 18n) {
      return base * 10n ** (decimals - 18n);
    }
    const divisor = 10n ** (18n - decimals);
    return base / divisor;
  })();

  const amountWei = tryParseAmountToWei(value, tokenDecimals);
  const isBelowMinimum =
    amountWei !== null && amountWei > 0n && amountWei < minForToken;
  const shouldHighlight = isBelowMinimum;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <div
        className={`flex items-center justify-between rounded-xl border p-4 shadow-sm transition-colors ${
          shouldHighlight ? "border-danger" : "border-border hover:border-primary"
        } bg-bg-surface`}
      >
        <div className="mr-4 min-w-0 flex-1">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder="0.00"
            className={`w-full bg-transparent text-xl font-semibold placeholder-text-muted focus:outline-none ${
              shouldHighlight ? "text-danger" : "text-text"
            }`}
          />
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMaxClick}
            className="flex-shrink-0 rounded-lg border border-border bg-bg-page px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            MAX
          </motion.button>

          {showButtons && tokenAddress && onCopyAddress && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCopyAddress}
              className="flex-shrink-0 rounded-lg border border-border bg-bg-page px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              title="Copy token address"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </motion.button>
          )}

          {showButtons && tokenAddress && fromChainId !== 1 && isConnected && (
            <AddToWalletButton
              token={{
                address: selectedTokenData?.address ?? tokenAddress,
                symbol: selectedToken,
                decimals: selectedTokenData?.decimals ?? 18,
                chainId: fromChainId ?? 369,
              }}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            />
          )}
        </div>
      </div>

      {isBelowMinimum && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-2 text-sm"
        >
          <div className="flex items-center gap-2 text-danger">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>
              The bridge requires a minimum of {MIN_NATIVE_ETH_AMOUNT_DISPLAY} {selectedToken || "tokens"} for this transaction.
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AmountInput;
