import { motion } from "framer-motion";
import React from "react";
import { TokenType } from "../../../types/Swap";
import ProviderIcon from "../../../components/ProviderIcon";
import useWallet from "../../../hooks/useWallet";
import AddToWalletButton from "../../../components/AddToWalletButton";

interface AmountInputProps {
  amount: string;
  token: TokenType | null;
  onAmountChange: (value: string) => void;
  isOutput?: boolean;
  outputAmount?: number;
  isLoading?: boolean;
  balance?: string;
  balanceLoading?: boolean;
  onCopyAddress?: () => void;
  onAddToWallet?: () => void;
}

const AmountInput: React.FC<AmountInputProps> = ({
  amount,
  token,
  onAmountChange,
  isOutput = false,
  outputAmount = 0,
  isLoading = false,
  balance = "0",
  balanceLoading = false,
  onCopyAddress,
  onAddToWallet,
}) => {
  // Use the injected EIP-1193 provider from web3-onboard (unwrap if wrapped)
  const { wallet, account, currentChainId } = useWallet();
  const injected =
    (wallet as any)?.provider?.provider ??
    (wallet as any)?.provider ??
    null;
  const isConnected = !!account;

  const formatAmount = (value: string) => {
    if (!value) return "";
    if (value.includes(".")) {
      const parts = value.split(".");
      return (
        parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + parts[1]
      );
    }
    return Number(value).toLocaleString();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isOutput) return; // Output field is read-only
    
    const value = e.target.value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) {
      onAmountChange(parts[0] + "." + parts.slice(1).join(""));
    } else {
      onAmountChange(value);
    }
  };

  const handleMaxClick = () => {
    if (isOutput) return; // Don't allow max click on output field
    
    // Use actual balance from props
    if (balance && !balanceLoading && parseFloat(balance) > 0) {
      onAmountChange(balance);
    }
  };

  const getDisplayValue = () => {
    if (isOutput) {
      if (outputAmount) {
        return formatAmount(outputAmount.toString());
      }
      return "0.00";
    }
    return formatAmount(amount);
  };

  const getPriceDisplay = () => {
    if (!token?.price) return "0.00$";
    
    const priceValue = isOutput 
      ? Number(token.price) * Number(outputAmount)
      : Number(token.price) * Number(amount);
    
    return `$${priceValue.toFixed(2)}`;
  };

  // Only show Add-to-wallet for non-Ethereum networks (prefer PulseChain)
  const isTokenOnEthereum = (t?: TokenType | null) => {
    if (!t) return false;
    const n1 = (t.blockchainNetwork || "").toLowerCase();
    const n2 = (t.network || "").toLowerCase();
    return n1 === "ethereum" || n1 === "eth" || n2 === "ethereum" || n2 === "eth";
  };

  return (
    <motion.div className="flex w-full flex-col items-end justify-center gap-2 sm:w-auto">
      <div className="flex w-full items-center justify-between">
        {/* Display Value or Input Field */}
        {isOutput ? (
          <div className="mr-3 flex-1 text-right text-base font-semibold sm:text-lg">
            {isLoading ? (
              <div className="flex items-center justify-end">
                <div className="h-5 w-20 animate-pulse rounded-full bg-border opacity-60 sm:h-6 sm:w-28"></div>
              </div>
            ) : (
              getDisplayValue()
            )}
          </div>
        ) : (
          <div className="relative mr-3 flex-1">
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="text"
              placeholder="Enter an Amount"
              value={getDisplayValue()}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-border bg-bg-surface px-4 py-3 text-right text-lg font-semibold text-text transition-colors placeholder-text-muted focus:border-primary focus:outline-none sm:text-xl"
            />
          </div>
        )}
        
        {/* Consistent Button Group - Always Show for Both Input and Output */}
        <div className="flex items-center gap-2">
          {/* MAX Button - Only for Input */}
          {!isOutput && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMaxClick}
              disabled={balanceLoading || parseFloat(balance || "0") <= 0}
              className="flex-shrink-0 rounded-lg border border-border bg-bg-page px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
            >
              MAX
            </motion.button>
          )}

          {/* Copy Button - For Both Input and Output */}
          {token && onCopyAddress && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCopyAddress}
              className="flex-shrink-0 rounded-lg border border-border bg-bg-page px-2 py-2 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              title="Copy token address"
            >
              <svg
                className="h-4 w-4"
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

          {/* Add to Wallet Button - Provider-aware icon */}
          {token && !isTokenOnEthereum(token) && isConnected ? (
            <AddToWalletButton
              token={{
                address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                // Swap currently targets PulseChain; align with existing implementation
                chainId: 369,
              }}
              variant="outline"
              size="sm"
            />
          ) : null}
        </div>
      </div>
      
      <div className="text-xs text-text-muted sm:text-sm">
        {isLoading ? (
          <div className="h-5 w-12 animate-pulse rounded-full bg-border opacity-60 sm:h-6 sm:w-16"></div>
        ) : (
          getPriceDisplay()
        )}
      </div>
    </motion.div>
  );
};

export default AmountInput; 
