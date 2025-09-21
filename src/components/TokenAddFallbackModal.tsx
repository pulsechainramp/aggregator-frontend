import React from "react";
import { TokenInfo } from "../utils/walletUtils";
import { PulseChainConfig, EthereumConfig } from "../config/chainConfig";
import { X, Copy, ExternalLink, Wallet as WalletIcon, Plus } from "lucide-react";

interface TokenAddFallbackModalProps {
  open: boolean;
  token: TokenInfo;
  onClose: () => void;
}

const CHAIN_INFO: Record<number, { name: string; explorerUrl: string }> = {
  [EthereumConfig.chainId]: { name: "Ethereum", explorerUrl: EthereumConfig.explorerUrl },
  [PulseChainConfig.chainId]: { name: "PulseChain", explorerUrl: PulseChainConfig.explorerUrl },
};

export default function TokenAddFallbackModal({ open, token, onClose }: TokenAddFallbackModalProps) {
  if (!open) return null;

  const chain = CHAIN_INFO[token.chainId] ?? {
    name: `Chain ID ${token.chainId}`,
    explorerUrl: "",
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token.address);
    } catch (e) {
      // no-op
    }
  };

  const explorerHref = chain.explorerUrl ? `${chain.explorerUrl}/token/${token.address}` : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-[92%] max-w-md rounded-2xl border border-[#3a3f5a] bg-[#1f2333] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-white">
            <span className="relative inline-flex items-center justify-center">
              <WalletIcon className="w-5 h-5" />
              <Plus className="w-3 h-3 absolute -right-2 -bottom-1 bg-transparent" />
            </span>
            <h3 className="text-lg font-semibold">Add token manually</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-gray-300" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-300 mb-4">
          Your wallet doesn’t support automatic add (EIP-747) in this context. Add the token manually using the details below.
        </p>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-400 mb-1">Token</div>
            <div className="text-white font-medium">{token.symbol} • {token.decimals} decimals</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Network</div>
            <div className="text-white font-medium">{chain.name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Contract address</div>
            <div className="flex items-center gap-2">
              <input
                value={token.address}
                readOnly
                className="w-full bg-[#2a2d3a] text-gray-200 text-xs font-mono px-3 py-2 rounded border border-[#3a3f5a]"
              />
              <button onClick={handleCopy} className="p-2 rounded bg-[#2a2d3a] border border-[#3a3f5a] text-gray-200 hover:bg-[#34384a]">
                <Copy className="w-4 h-4" />
              </button>
              {explorerHref && (
                <a
                  href={explorerHref}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded bg-[#2a2d3a] border border-[#3a3f5a] text-gray-200 hover:bg-[#34384a]"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500">Done</button>
        </div>
      </div>
    </div>
  );
}
