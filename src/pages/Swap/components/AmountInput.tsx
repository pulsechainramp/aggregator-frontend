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
    <motion.div className="flex flex-col items-end justify-center gap-2 w-full sm:w-auto">
      <div className="flex items-center justify-between w-full">
        {/* Display Value or Input Field */}
        {isOutput ? (
          <div className="text-base sm:text-lg font-medium flex-1 mr-3">
            {isLoading ? (
              <div className="flex items-center justify-end">
                <div className="w-20 sm:w-28 h-5 sm:h-6 bg-gray-600 rounded-full animate-pulse opacity-30"></div>
              </div>
            ) : (
              getDisplayValue()
            )}
          </div>
        ) : (
          <div className="relative flex-1 mr-3">
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="text"
              placeholder="Enter an Amount"
              value={getDisplayValue()}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-[#2b2e4a] border-2 border-[#3a3f5a] rounded-xl text-right text-lg sm:text-xl placeholder-gray-300 font-medium text-white focus:outline-none focus:border-emerald-500/50 focus:bg-[#2b2e4a] transition-all duration-200 shadow-sm hover:border-[#4a4f6a]"
            />
            <div className="absolute inset-0 rounded-xl border-2 border-transparent pointer-events-none transition-all duration-200 focus-within:border-emerald-500/30"></div>
          </div>
        )}
        
        {/* Consistent Button Group - Always Show for Both Input and Output */}
        <div className="flex items-center space-x-1">
          {/* MAX Button - Only for Input */}
          {!isOutput && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMaxClick}
              disabled={balanceLoading || parseFloat(balance || "0") <= 0}
              className="px-3 py-3 text-xs bg-gradient-to-r from-[#3a3f5a] to-[#2b2e4a] text-gray-300 rounded-lg hover:from-[#4a4f6a] hover:to-[#3a3f5a] hover:text-white transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed border border-[#4a4f6a] hover:border-[#5a5f7a] flex-shrink-0"
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
              className="px-3 py-3 text-xs bg-gradient-to-r from-[#3a3f5a] to-[#2b2e4a] text-gray-300 rounded-lg hover:from-[#4a4f6a] hover:to-[#3a3f5a] hover:text-white transition-all duration-200 font-medium border border-[#4a4f6a] hover:border-[#5a5f7a] flex-shrink-0"
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
              className="flex-shrink-0"
            />
          ) : null}
        </div>
      </div>
      
      <div className="text-xs sm:text-sm text-gray-400">
        {isLoading ? (
          <div className="w-12 sm:w-16 h-5 sm:h-6 bg-gray-600 rounded-full animate-pulse opacity-30"></div>
        ) : (
          getPriceDisplay()
        )}
      </div>
    </motion.div>
  );
};

export default AmountInput; 