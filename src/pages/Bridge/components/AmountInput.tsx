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
      <div className={`flex items-center justify-between p-4 bg-gradient-to-br from-[#2b2e4a] to-[#1e2030] rounded-xl border transition-all duration-200 shadow-lg ${
        isBelowMinimum 
          ? 'border-red-500/50 hover:border-red-500/70' 
          : 'border-[#3a3f5a] hover:border-[#4a4f6a]'
      }`}>
        <div className="flex-1 min-w-0 mr-4">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder="0.00"
            className={`w-full bg-transparent text-xl font-semibold placeholder-gray-500 focus:outline-none ${
              isBelowMinimum ? 'text-red-300' : 'text-white'
            }`}
          />
        </div>
        <div className="flex items-center min-w-0 w-32 justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMaxClick}
            className="px-3 py-1.5 text-xs bg-gradient-to-r from-[#3a3f5a] to-[#2b2e4a] text-gray-300 rounded-lg hover:from-[#4a4f6a] hover:to-[#3a3f5a] hover:text-white transition-all duration-200 font-medium flex-shrink-0"
          >
            MAX
          </motion.button>

          {showButtons && tokenAddress && (
            <>
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

              {fromChainId !== 1 && isConnected && (
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
            </>
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
          <div className="flex items-center gap-2 text-red-400">
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
              className="text-gray-400 hover:text-gray-300 transition-colors"
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
                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-[#1e2030] border border-[#3a3f5a] rounded-lg p-3 shadow-xl z-50"
              >
                <div className="text-xs text-gray-300 leading-relaxed">
                  <p className="font-medium text-white mb-1">Why this minimum exists:</p>
                  <p>This minimum is set by the official PulseChain bridge to ensure the transaction can cover its complex gas fees on both the Ethereum and PulseChain networks. The bridge needs sufficient ETH to:</p>
                  <ul className="mt-2 space-y-1 text-gray-400">
                    <li>• Pay Ethereum gas fees for the initial transaction</li>
                    <li>• Cover PulseChain gas fees for the final transaction</li>
                    <li>• Handle the bridge's internal processing costs</li>
                  </ul>
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#3a3f5a]"></div>
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
          className="mt-2 flex items-center gap-2 text-sm text-green-400"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Amount meets minimum requirement for bridging</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AmountInput;
