import React, { useState } from "react";
import { motion } from "framer-motion";
import ProviderIcon from "../../../components/ProviderIcon";
import useWallet from "../../../hooks/useWallet";
import AddToWalletButton from "../../../components/AddToWalletButton";

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Only allow numbers and decimals
    if (/^\d*\.?\d*$/.test(inputValue) || inputValue === "") {
      onChange(inputValue);
    }
  };

  const handleMaxClick = () => {
    // Use actual balance from contract
    if (balance && !balanceLoading && parseFloat(balance) > 0) {
      onChange(balance);
    }
  };

  // Check if this is ETH native token on Ethereum chain
  const isEthNative = selectedTokenData?.address === "0x0000000000000000000000000000000000000000" && fromChainId === 1;
  const minAmount = 0.018;
  const currentAmount = parseFloat(value || "0");
  const isBelowMinimum = isEthNative && currentAmount > 0 && currentAmount < minAmount;

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
            value={value}
            onChange={handleInputChange}
            placeholder="0.00"
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
            <span>The PulseChain bridge requires a minimum of {minAmount} ETH for this transaction.</span>
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

      {/* Success message when amount is valid */}
      {isEthNative && currentAmount >= minAmount && currentAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-2 text-sm text-success"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Amount meets minimum requirement for bridging</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AmountInput;
