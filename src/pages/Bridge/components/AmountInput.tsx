import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import useWallet from "../../../hooks/useWallet";
import AddToWalletButton from "../../../components/AddToWalletButton";
import { tryParseAmountToWei } from "../../../utils/amount";
import { ZeroAddress } from "../../../const/swap";
import {
  MIN_NATIVE_ETH_AMOUNT_WEI,
} from "../constants";
import { useNumberFormat } from "../../../context/NumberFormatContext";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedToken: string;
  balance: string;
  balanceLoading: boolean;
  tokenAddress?: string;
  onCopyAddress?: () => void;
  onAddToWallet?: () => void;
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
  onAddToWallet,
  showButtons = false,
  fromChainId,
  selectedTokenData,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const { wallet, account, currentChainId } = useWallet();
  const injected = (wallet as any)?.provider?.provider ?? (wallet as any)?.provider ?? null;
  const isConnected = !!account;
  const { sanitizeInput, normalizeInput, formatNumber, parseInput } = useNumberFormat();
  const [displayValue, setDisplayValue] = useState<string>(value ?? "");
  const placeholder = formatNumber(0, {
    minFractionDigits: 2,
    maxFractionDigits: 2,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const sanitized = sanitizeInput(inputValue);
    setDisplayValue(sanitized);
    onChange(normalizeInput(sanitized));
  };

  useEffect(() => {
    if (value === undefined || value === null) {
      setDisplayValue("");
      return;
    }

    // Preserve in-progress decimal input (e.g., "0." from "0," in locales) without reformatting it away.
    if (value === "-" || value === "." || value.endsWith(".")) {
      return;
    }

    if (!value) {
      setDisplayValue("");
      return;
    }

    const numeric = parseInput(value);
    if (!Number.isFinite(numeric)) {
      setDisplayValue(value);
      return;
    }

    const fractionLength = value.includes(".")
      ? (value.split(".")[1]?.length ?? 0)
      : 0;

    setDisplayValue(
      formatNumber(numeric, {
        minFractionDigits: fractionLength,
        maxFractionDigits: Math.max(6, fractionLength),
      })
    );
  }, [value, formatNumber, parseInput]);

  const tokenDecimals = selectedTokenData?.decimals ?? 18;

  const handleMaxClick = () => {
    if (!balance || balanceLoading) return;
    const balanceWei = tryParseAmountToWei(balance, tokenDecimals);
    if (balanceWei && balanceWei > 0n) {
      onChange(balance);
      const numeric = parseFloat(balance);
      if (Number.isFinite(numeric)) {
        setDisplayValue(formatNumber(numeric, { maxFractionDigits: 18 }));
      }
    }
  };

  // Check if this is ETH native token on Ethereum chain
  const isEthNative =
    selectedTokenData?.address === ZeroAddress && fromChainId === 1;
  const amountWei = tryParseAmountToWei(value, tokenDecimals);
  const isBelowMinimum =
    isEthNative &&
    amountWei !== null &&
    amountWei > 0n &&
    amountWei < MIN_NATIVE_ETH_AMOUNT_WEI;

  const formattedMinEth = formatNumber(
    Number(MIN_NATIVE_ETH_AMOUNT_WEI) / 1e18,
    { maxFractionDigits: 6 }
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <div
        className={`flex items-center justify-between rounded-xl border p-4 shadow-sm transition-colors ${
          isBelowMinimum ? "border-danger" : "border-border hover:border-primary"
        } bg-bg-surface`}
      >
        <div className="mr-4 min-w-0 flex-1">
          <input
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={`w-full bg-transparent text-xl font-semibold placeholder-text-muted focus:outline-none ${
              isBelowMinimum ? "text-danger" : "text-text"
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

          {/* Copy Button */}
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

          {/* Add to Wallet Button */}
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

      {/* Live Validation Message */}
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
            <span>The PulseChain bridge requires a minimum of {formattedMinEth} ETH for this transaction.</span>
          </div>
          
          {/* Tooltip Icon */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="transition-colors text-text-muted hover:text-primary"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-1/2 z-50 mb-2 w-80 -translate-x-1/2 transform rounded-lg border border-border bg-bg-surface p-3 shadow-md"
              >
                <div className="text-xs leading-relaxed text-text-muted">
                  <p className="mb-1 font-medium text-text">Why this minimum exists:</p>
                  <p>This minimum is set by the official PulseChain bridge to ensure the transaction can cover its complex gas fees on both the Ethereum and PulseChain networks. The bridge needs sufficient ETH to:</p>
                  <ul className="mt-2 space-y-1 text-text-muted">
                    <li>- Pay Ethereum gas fees for the initial transaction</li>
                    <li>- Cover PulseChain gas fees for the final transaction</li>
                    <li>- Handle the bridge&apos;s internal processing costs</li>
                  </ul>
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-border"></div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

    </motion.div>
  );
};

export default AmountInput;
